export default function PrivacyIndicator({ type = 'private', children }) {
    return (
        <span className={`privacy-indicator ${type}`}>
            {children || (type === 'private' ? 'Private' : 'Public')}
        </span>
    )
}
