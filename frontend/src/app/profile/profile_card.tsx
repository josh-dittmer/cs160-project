import "./profile.css";

export default function ProfileCard() {
  return (
    <article className="card profile-card">
      <div className="avatar-wrap">
        <img
          src="/images/profile-placeholder.jpg"
          alt="User avatar"
          className="avatar"
        />
        <button className="avatar-edit" aria-label="Edit photo">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>
      </div>

      <h2 className="name">Esther Howard</h2>

      <p className="address">
        Hubertusstraße 149, 41239 <br />
        Mönchengladbach
      </p>

      <div className="rating">
        <span className="star" aria-hidden>
          ★
        </span>
        <span>5.0 (1)</span>
      </div>

      <button className="close-account">Close Account</button>
    </article>
  );
}
