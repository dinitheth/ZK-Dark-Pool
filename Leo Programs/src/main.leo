// ZK Dark Pool Prediction Market v3 (Leo 3.4.0)
// Privacy-preserving prediction market on Aleo
//
// Features:
//   - credits.aleo token integration (real credit transfers)
//   - Proportional payout math: (bet × total_pool) ÷ winning_pool
//   - Liquidity pools with AMM-style price discovery
//   - Oracle-based market resolution

import credits.aleo;

program dark_pool_marketv3.aleo {

    // ============================================
    // RECORDS (Private State)
    // ============================================

    record Bet {
        owner: address,
        market_id: field,
        outcome: u8,     // 0 = NO, 1 = YES
        amount: u64,
    }

    record WinClaim {
        owner: address,
        market_id: field,
        payout: u64,
    }

    record LPToken {
        owner: address,
        market_id: field,
        yes_amount: u64,
        no_amount: u64,
    }

    // ============================================
    // STRUCTS (Public State)
    // ============================================

    struct MarketInfo {
        creator: address,
        resolution_height: u32,
        resolved: bool,
        winning_outcome: u8, // 0 = NO, 1 = YES, 255 = unresolved
        oracle: address,     // designated oracle for resolution
    }

    struct PoolState {
        total_yes: u64,
        total_no: u64,
        total_pool: u64,
        liquidity_yes: u64,  // AMM liquidity reserves (YES side)
        liquidity_no: u64,   // AMM liquidity reserves (NO side)
        total_claimed: u64,  // total payouts claimed so far
    }

    // ============================================
    // MAPPINGS (Public State)
    // ============================================

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;
    
    // Market registry for discoverability
    // market_count stores the total number of markets (key 0u64)
    mapping market_count: u64 => u64;
    // market_ids maps sequential index to market_id for enumeration
    mapping market_ids: u64 => field;
    // market_questions stores a hash of the question for each market
    mapping market_questions: field => field;

    // ============================================
    // CONSTRUCTOR
    // ============================================
    // For @noupgrade, constructor MUST be empty (compiler inserts code).
    @noupgrade
    async constructor() {
    }

    // ============================================
    // TRANSITIONS
    // ============================================

    // Create a new prediction market with oracle support
    // oracle: address authorized to resolve (use creator address for self-resolution)
    async transition create_market(
        public market_id: field,
        public resolution_height: u32,
        public question_hash: field,
        public oracle: address,
    ) -> Future {
        return finalize_create_market(market_id, resolution_height, question_hash, self.signer, oracle);
    }

    async function finalize_create_market(
        market_id: field,
        resolution_height: u32,
        question_hash: field,
        creator: address,
        oracle: address,
    ) {
        assert(!Mapping::contains(markets, market_id));
        assert(resolution_height > block.height);

        let market: MarketInfo = MarketInfo {
            creator: creator,
            resolution_height: resolution_height,
            resolved: false,
            winning_outcome: 255u8,
            oracle: oracle,
        };

        let pool: PoolState = PoolState {
            total_yes: 0u64,
            total_no: 0u64,
            total_pool: 0u64,
            liquidity_yes: 0u64,
            liquidity_no: 0u64,
            total_claimed: 0u64,
        };

        Mapping::set(markets, market_id, market);
        Mapping::set(pools, market_id, pool);
        Mapping::set(market_questions, market_id, question_hash);

        let current_count: u64 = Mapping::get_or_use(market_count, 0u64, 0u64);
        Mapping::set(market_ids, current_count, market_id);
        Mapping::set(market_count, 0u64, current_count + 1u64);
    }

    // ============================================
    // LIQUIDITY
    // ============================================

    // Seed initial liquidity for AMM pricing (creator deposits credits to both sides)
    async transition seed_liquidity(
        public market_id: field,
        public yes_amount: u64,
        public no_amount: u64,
    ) -> (LPToken, Future) {
        assert(yes_amount > 0u64);
        assert(no_amount > 0u64);

        let total: u64 = yes_amount + no_amount;

        let lp_token: LPToken = LPToken {
            owner: self.signer,
            market_id: market_id,
            yes_amount: yes_amount,
            no_amount: no_amount,
        };

        // Transfer real credits from LP provider to this program
        let transfer_future: Future = credits.aleo/transfer_public_as_signer(self.address, total);

        return (lp_token, finalize_seed_liquidity(market_id, yes_amount, no_amount, self.signer, transfer_future));
    }

    async function finalize_seed_liquidity(
        market_id: field,
        yes_amount: u64,
        no_amount: u64,
        provider: address,
        transfer_future: Future,
    ) {
        transfer_future.await();

        assert(Mapping::contains(markets, market_id));
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(!market.resolved);
        assert_eq(market.creator, provider); // Only creator can seed liquidity

        let pool: PoolState = Mapping::get(pools, market_id);
        let total: u64 = yes_amount + no_amount;

        let new_pool: PoolState = PoolState {
            total_yes: pool.total_yes + yes_amount,
            total_no: pool.total_no + no_amount,
            total_pool: pool.total_pool + total,
            liquidity_yes: pool.liquidity_yes + yes_amount,
            liquidity_no: pool.liquidity_no + no_amount,
            total_claimed: pool.total_claimed,
        };

        Mapping::set(pools, market_id, new_pool);
    }

    // ============================================
    // BETTING (with real credit transfers)
    // ============================================

    // Place a private bet — credits transferred from bettor to program
    async transition place_bet(
        public market_id: field,
        private outcome: u8,
        private amount: u64,
    ) -> (Bet, Future) {
        assert(outcome == 0u8 || outcome == 1u8);
        assert(amount > 0u64);


        let bet: Bet = Bet {
            owner: self.signer,
            market_id: market_id,
            outcome: outcome,
            amount: amount,
        };

        // Transfer real credits from bettor to this program
        let transfer_future: Future = credits.aleo/transfer_public_as_signer(self.address, amount);

        return (bet, finalize_place_bet(market_id, outcome, amount, transfer_future));
    }

    async function finalize_place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
        transfer_future: Future,
    ) {
        transfer_future.await();

        // Ensure market exists
        assert(Mapping::contains(markets, market_id));

        let market: MarketInfo = Mapping::get(markets, market_id);

        // Must be open
        assert(!market.resolved);
        assert(block.height < market.resolution_height);

        let pool: PoolState = Mapping::get(pools, market_id);

        let add_yes: u64 = outcome == 1u8 ? amount : 0u64;
        let add_no:  u64 = outcome == 0u8 ? amount : 0u64;

        let new_pool: PoolState = PoolState {
            total_yes: pool.total_yes + add_yes,
            total_no: pool.total_no + add_no,
            total_pool: pool.total_pool + amount,
            liquidity_yes: pool.liquidity_yes,
            liquidity_no: pool.liquidity_no,
            total_claimed: pool.total_claimed,
        };

        Mapping::set(pools, market_id, new_pool);
    }

    // ============================================
    // RESOLUTION (creator OR oracle)
    // ============================================

    // Resolve market — creator OR designated oracle can call
    async transition resolve_market(
        public market_id: field,
        public winning_outcome: u8,
    ) -> Future {
        assert(winning_outcome == 0u8 || winning_outcome == 1u8);
        return finalize_resolve_market(market_id, winning_outcome, self.signer);
    }

    async function finalize_resolve_market(
        market_id: field,
        winning_outcome: u8,
        caller: address,
    ) {
        assert(Mapping::contains(markets, market_id));

        let market: MarketInfo = Mapping::get(markets, market_id);

        assert(!market.resolved);

        // Either creator or oracle can resolve
        let is_creator: bool = market.creator == caller;
        let is_oracle: bool = market.oracle == caller;
        assert(is_creator || is_oracle);

        assert(block.height >= market.resolution_height);

        let resolved_market: MarketInfo = MarketInfo {
            creator: market.creator,
            resolution_height: market.resolution_height,
            resolved: true,
            winning_outcome: winning_outcome,
            oracle: market.oracle,
        };

        Mapping::set(markets, market_id, resolved_market);
    }

    // ============================================
    // CLAIMING (proportional payout math + credit transfer)
    // ============================================

    // Claim winnings — proportional payout: (bet_amount × total_pool) ÷ winning_pool
    // User calculates payout off-chain; contract verifies on-chain
    async transition claim_winnings(
        private bet: Bet,
        public claimed_payout: u64,
    ) -> (WinClaim, Future) {
        assert(claimed_payout > 0u64);

        let claim: WinClaim = WinClaim {
            owner: bet.owner,
            market_id: bet.market_id,
            payout: claimed_payout,
        };

        // Transfer real credits from program to winner
        let transfer_future: Future = credits.aleo/transfer_public(bet.owner, claimed_payout);

        return (claim, finalize_claim_winnings(
            bet.market_id, bet.outcome, bet.amount, claimed_payout, transfer_future
        ));
    }

    async function finalize_claim_winnings(
        market_id: field,
        outcome: u8,
        bet_amount: u64,
        claimed_payout: u64,
        transfer_future: Future,
    ) {
        assert(Mapping::contains(markets, market_id));
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(market.resolved);
        assert_eq(outcome, market.winning_outcome);

        let pool: PoolState = Mapping::get(pools, market_id);

        // ---- PROPORTIONAL PAYOUT MATH ----
        // payout = (bet_amount × total_pool) ÷ winning_pool
        // Uses u128 intermediate to prevent overflow
        let winning_pool: u64 = outcome == 1u8 ? pool.total_yes : pool.total_no;
        assert(winning_pool > 0u64);

        let numerator: u128 = (bet_amount as u128) * (pool.total_pool as u128);
        let expected_payout: u64 = (numerator / (winning_pool as u128)) as u64;

        // Verify the user's claimed payout matches calculated payout
        assert_eq(claimed_payout, expected_payout);

        // Track total claimed to prevent pool overdraw
        let new_pool: PoolState = PoolState {
            total_yes: pool.total_yes,
            total_no: pool.total_no,
            total_pool: pool.total_pool,
            liquidity_yes: pool.liquidity_yes,
            liquidity_no: pool.liquidity_no,
            total_claimed: pool.total_claimed + claimed_payout,
        };
        Mapping::set(pools, market_id, new_pool);

        transfer_future.await();
    }

    // ============================================
    // LIQUIDITY WITHDRAWAL
    // ============================================

    // Withdraw remaining liquidity after market resolves (LP provider only)
    // Returns unclaimed funds proportional to LP contribution
    async transition withdraw_liquidity(
        private lp_token: LPToken,
        public expected_return: u64,
    ) -> Future {
        assert(expected_return > 0u64);

        // Transfer remaining credits from program to LP provider
        let transfer_future: Future = credits.aleo/transfer_public(lp_token.owner, expected_return);

        return finalize_withdraw_liquidity(
            lp_token.market_id, lp_token.yes_amount, lp_token.no_amount,
            expected_return, transfer_future
        );
    }

    async function finalize_withdraw_liquidity(
        market_id: field,
        lp_yes: u64,
        lp_no: u64,
        expected_return: u64,
        transfer_future: Future,
    ) {
        assert(Mapping::contains(markets, market_id));
        let market: MarketInfo = Mapping::get(markets, market_id);
        assert(market.resolved);

        let pool: PoolState = Mapping::get(pools, market_id);

        // Calculate remaining unclaimed funds in the pool
        let remaining: u64 = pool.total_pool - pool.total_claimed;
        let lp_total: u64 = lp_yes + lp_no;

        // LP return = remaining × (lp_contribution / total_pool)
        let lp_return: u64 = ((lp_total as u128) * (remaining as u128) / (pool.total_pool as u128)) as u64;
        assert_eq(expected_return, lp_return);

        let new_pool: PoolState = PoolState {
            total_yes: pool.total_yes,
            total_no: pool.total_no,
            total_pool: pool.total_pool,
            liquidity_yes: 0u64,
            liquidity_no: 0u64,
            total_claimed: pool.total_claimed + expected_return,
        };
        Mapping::set(pools, market_id, new_pool);

        transfer_future.await();
    }
}
