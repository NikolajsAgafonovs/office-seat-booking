// DEV IDENTITY PROVIDER ONLY (decision 0007, option 2). Shown when GET /api/me is 401:
// lists the fixture users from GET /api/dev/users; clicking one POSTs /api/dev/login and
// reloads state. Deployed environments use OIDC and never render this card.
import { useEffect, useState } from 'react';
import type { UserProfile } from '@seat/shared';
import { api } from '../api';
import { useStore } from '../store';

export function DevSignIn() {
  const signIn = useStore((s) => s.signIn);
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .devUsers()
      .then((u) => {
        if (alive) setUsers(u);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="card signin" data-testid="dev-sign-in">
      <h3>Sign in</h3>
      {failed ? (
        <p className="empty">
          Sign-in is not available: the server is not running in development auth mode.
        </p>
      ) : users === null ? (
        <p className="empty">Loading users…</p>
      ) : (
        <>
          <p className="hint">Development sign-in: pick a fixture user (decision 0007).</p>
          <ul>
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="btn"
                  data-testid={`dev-user-${u.id}`}
                  onClick={() => void signIn(u.id)}
                >
                  <img src={u.avatarUrl} alt="" />
                  <span>{u.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
