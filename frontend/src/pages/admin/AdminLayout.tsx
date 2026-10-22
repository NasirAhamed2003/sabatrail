import { NavLink, Outlet } from "react-router";
import "./Admin.css";

// Management area: section navigation beside the current admin page
export default function AdminLayout() {
  return (
    <div className="container admin">
      <aside className="admin-sidebar">
        <span className="eyebrow">SABATRAIL MANAGEMENT</span>
        <nav aria-label="Management">
          <ul>
            <li>
              <NavLink to="/admin/places">Places</NavLink>
            </li>
            <li>
              <NavLink to="/admin/categories">Categories</NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
