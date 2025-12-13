import "./SidebarSkeleton.css"
const SidebarSkeleton = () => {
  return (
    <aside className="sidebar">
      <div className="skeleton-title shimmer" />

      <div className="skeleton-list">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="skeleton-item" key={i}>
            <div className="skeleton-avatar shimmer" />

            <div className="skeleton-text">
              <div className="skeleton-line shimmer" />
              <div className="skeleton-line short shimmer" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default SidebarSkeleton;
