import { Link } from "react-router-dom";
import "./ViewAllLink.css";
export default function ViewAllLink({ to, label }) {
  return (
    <Link className="listing-view-all" to={to} aria-label={label}>
      View All <span aria-hidden="true">&gt;</span>
    </Link>
  );
}
