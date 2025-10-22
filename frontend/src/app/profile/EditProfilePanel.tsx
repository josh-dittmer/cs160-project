import "./profile.css";
import "./profile_edit.css";

type Props = { onCancel?: () => void };

export default function EditProfilePanel({ onCancel }: Props) {
  return (
    <section className="card edit-card">
      <header className="edit-head">
        <h3>Profile</h3>
        <span className="sub">User Information</span>
      </header>

      <form className="form-grid">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" defaultValue="Stella J" />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" defaultValue="stellajiangwork@gmail.com" />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" defaultValue="510-123 1234" />
        </div>

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn primary">Save Now</button>
        </div>

        <hr className="sep" />
        <h4 className="section-title">Password</h4>

        <div className="field">
          <label htmlFor="curpass">Current Password</label>
          <div className="input-affix">
            <input id="curpass" type="password" placeholder="••••••••••" />
            <button type="button" className="iconbtn" aria-label="Toggle visibility">👁️</button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="newpass">New Password</label>
          <div className="input-affix">
            <input id="newpass" type="password" placeholder="New password" />
            <button type="button" className="iconbtn" aria-label="Toggle visibility">👁️</button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="confpass">Confirm New Password</label>
          <div className="input-affix">
            <input id="confpass" type="password" placeholder="Confirm new password" />
            <button type="button" className="iconbtn" aria-label="Toggle visibility">👁️</button>
          </div>
        </div>

        <div className="actions sticky">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn primary">Save Changes</button>
        </div>
      </form>
    </section>
  );
}
