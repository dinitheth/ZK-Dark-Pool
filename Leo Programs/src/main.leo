// ZK Dark Pool Prediction Market (Leo 3.4.0)
// Privacy-preserving prediction market on Aleo

program dark_pool_market.aleo {

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

    // ============================================
    // STRUCTS (Public State)
    // ============================================

    struct MarketInfo {
        creator: address,
        resolution_height: u32,
        resolved: bool,
        winning_outcome: u8, // 0 = NO, 1 = YES, 255 = unresolved
    }

    struct PoolState {
        total_yes: u64,
        total_no: u64,
        total_pool: u64,
    }

    // ============================================
    // MAPPINGS (Public State)
    // ============================================

    mapping markets: field => MarketInfo;
    mapping pools: field => PoolState;

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

    // Create a new prediction market
    async transition create_market(
        public market_id: field,
        public resolution_height: u32,
    ) -> Future {
        // self.signer is the user who originated the call (safer than self.caller for ownership).
        return finalize_create_market(market_id, resolution_height, self.signer);
    }

    async function finalize_create_market(
        market_id: field,
        resolution_height: u32,
        creator: address,
    ) {
        // Ensure market doesn't exist
        assert(!Mapping::contains(markets, market_id));

        // Must resolve in the future
        assert(resolution_height > block.height);

        let market: MarketInfo = MarketInfo {
            creator: creator,
            resolution_height: resolution_height,
            resolved: false,
            winning_outcome: 255u8,
        };

        let pool: PoolState = PoolState {
            total_yes: 0u64,
            total_no: 0u64,
            total_pool: 0u64,
        };

        Mapping::set(markets, market_id, market);
        Mapping::set(pools, market_id, pool);
    }

    // Place a private bet (creates a private record + updates public pool)
    async transition place_bet(
        public market_id: field,
        private outcome: u8,
        private amount: u64,
    ) -> (Bet, Future) {
        assert(outcome == 0u8 || outcome == 1u8);
        assert(amount > 0u64);

        // Use self.signer so a program caller can’t become the record owner.
        let bet: Bet = Bet {
            owner: self.signer,
            market_id: market_id,
            outcome: outcome,
            amount: amount,
        };

        return (bet, finalize_place_bet(market_id, outcome, amount));
    }

    async function finalize_place_bet(
        market_id: field,
        outcome: u8,
        amount: u64,
    ) {
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
        };

        Mapping::set(pools, market_id, new_pool);
    }

    // Resolve market - only creator can call
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
        assert_eq(market.creator, caller);

        // Can only resolve at/after resolution_height
        assert(block.height >= market.resolution_height);

        let resolved_market: MarketInfo = MarketInfo {
            creator: market.creator,
            resolution_height: market.resolution_height,
            resolved: true,
            winning_outcome: winning_outcome,
        };

        Mapping::set(markets, market_id, resolved_market);
    }

    // Claim winnings - private proof that your bet matches winning outcome
    async transition claim_winnings(
        private bet: Bet,
    ) -> (WinClaim, Future) {
        let claim: WinClaim = WinClaim {
            owner: bet.owner,
            market_id: bet.market_id,
            payout: bet.amount,
        };

        return (claim, finalize_claim_winnings(bet.market_id, bet.outcome));
    }

    async function finalize_claim_winnings(
        market_id: field,
        outcome: u8,
    ) {
        assert(Mapping::contains(markets, market_id));

        let market: MarketInfo = Mapping::get(markets, market_id);

        assert(market.resolved);
        assert_eq(outcome, market.winning_outcome);
    }
}
