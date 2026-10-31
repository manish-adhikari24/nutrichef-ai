import { Link } from 'react-router-dom';
import { NAV_GROUPS } from '../../components/DashboardLayout.jsx';

// Phone menu for the pages that don't fit in the bottom bar.
export default function More() {
  const groups = NAV_GROUPS.filter((group) => group.label !== 'Main');
  return (
    <>
      <h1 className="dash-title">More</h1>
      {groups.map((group) => (
        <section key={group.label} className="dash-section" aria-label={group.label}>
          <h2 className="dash-h2">{group.label}</h2>
          <ul className="dash-rows">
            {group.links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="more-link"><Icon size={22} aria-hidden /> {label}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
