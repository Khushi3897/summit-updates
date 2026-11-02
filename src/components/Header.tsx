import { useRef } from 'react';
import { VIEWER_GROUPS } from '../lib/presentation';
import { resetDemo, switchUser } from '../lib/store';

export function Header({ currentUserId }: { currentUserId: string }) {
  const menu = useRef<HTMLDetailsElement>(null);

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-row">
          <a className="brand" href="#/">Summit Updates</a>
          <details className="demo-menu" ref={menu}>
            <summary aria-label="Demo options">⋯</summary>
            <div className="menu-panel">
              <button type="button" onClick={() => {
                resetDemo();
                window.location.hash = '/';
                if (menu.current) menu.current.open = false;
              }}>Reset demo data</button>
            </div>
          </details>
        </div>
        <div className="viewer-field">
          <label htmlFor="viewer">Viewing as</label>
          <select id="viewer" value={currentUserId} onChange={event => {
            switchUser(event.target.value);
            window.location.hash = '/';
          }}>
            {VIEWER_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
