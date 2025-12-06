// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import { ROOMS } from './data/rooms';

const API_BASE = 'http://localhost:5000';

function App() {
  const [view, setView] = useState('welcome'); // 'welcome' | 'auth' | 'app'
  const [user, setUser] = useState(null);      // {id, username} or null

  const [selectedRoomId, setSelectedRoomId] = useState(ROOMS[0].id);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reservations, setReservations] = useState([]);

  // 🔄 edit mode (which reservation is being edited)
  const [editingId, setEditingId] = useState(null);

  // Auth form state
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const selectedRoom = ROOMS.find((r) => r.id === selectedRoomId);

  // Load reservations from backend
  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch(`${API_BASE}/api/reservations`);
        const data = await res.json();
        setReservations(data);
      } catch (err) {
        console.error('Error loading reservations:', err);
      }
    }
    fetchReservations();
  }, []);

  // =============== AUTH HANDLERS ===============

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!authUsername || !authPassword) {
      setAuthError('Please enter username and password.');
      return;
    }

    const endpoint =
      authMode === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      setUser(data);
      setView('app');
      setAuthPassword('');
    } catch (err) {
      console.error(err);
      setAuthError('Server error. Check backend / XAMPP.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('welcome');
  };

  // =============== RESERVATION HANDLERS ===============

  // 🔄 load a reservation into the form for editing
  const handleEditClick = (item) => {
    // ❗ Only the owner can edit
    if (!user || item.username !== user.username) {
      alert('You can only edit your own reservations.');
      return;
    }

    setView('app'); // just in case we’re on another view

    // Match room by name so the correct card is selected
    const roomByName = ROOMS.find((r) => r.name === item.roomName);
    if (roomByName) {
      setSelectedRoomId(roomByName.id);
    }

    setDate(item.date);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setPurpose(item.purpose);
    setEditingId(item.id);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate('');
    setStartTime('');
    setEndTime('');
    setPurpose('');
  };

  const handleReserve = async (e) => {
    e.preventDefault();

    if (!date || !startTime || !endTime || !purpose) {
      alert('Please fill in all fields.');
      return;
    }

    if (!user) {
      alert('You must be logged in to reserve a room.');
      return;
    }

    const payload = {
      roomName: selectedRoom.name,
      date,
      startTime,
      endTime,
      purpose,
      username: user.username,
    };

    try {
      let res;

      // 🔄 If editingId exists, UPDATE instead of CREATE
      if (editingId) {
        res = await fetch(`${API_BASE}/api/reservations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const saved = await res.json();

      if (!res.ok) {
        // If backend says "not allowed" or something else
        alert(saved.error || 'Failed to save reservation');
        return;
      }

      if (editingId) {
        // Replace the existing one in the list
        setReservations((prev) =>
          prev.map((item) => (item.id === saved.id ? saved : item))
        );
      } else {
        // Put new reservation at top of list
        setReservations((prev) => [saved, ...prev]);
      }

      // Reset form
      setDate('');
      setStartTime('');
      setEndTime('');
      setPurpose('');

      const message = editingId
        ? `Updated reservation for ${selectedRoom.name} on ${saved.date}.`
        : `Reserved ${selectedRoom.name} on ${saved.date}.`;

      alert(message);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Error saving reservation. Check backend / XAMPP server.');
    }
  };

  // ❌ DELETE reservation (owner only)
  const handleDelete = async (item) => {
    if (!user || item.username !== user.username) {
      alert('You can only delete your own reservations.');
      return;
    }

    const ok = window.confirm(
      `Delete reservation for ${item.roomName} on ${item.date}?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/reservations/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to delete reservation');
        return;
      }

      // Remove from list
      setReservations((prev) =>
        prev.filter((r) => r.id !== item.id)
      );

      // If we were editing this one, reset form
      if (editingId === item.id) {
        handleCancelEdit();
      }

      alert('Reservation deleted.');
    } catch (err) {
      console.error(err);
      alert('Error deleting reservation. Check backend / XAMPP server.');
    }
  };

  // =============== VIEWS ===============

  // WELCOME PAGE (desktop-style school promo)
  if (view === 'welcome') {
    return (
      <div className="welcome-root">
        {/* Top site header */}
        <header className="welcome-header">
          <div className="welcome-brand">
            <div className="welcome-logo-mark" />
            <div>
              <div className="welcome-brand-title">ReserveIT</div>
              <div className="welcome-brand-sub">Campus Room Scheduler</div>
            </div>
          </div>

          <nav className="welcome-nav">
            <button
              className="nav-link"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Home
            </button>
            <button
              className="nav-link"
              onClick={() =>
                document
                  .getElementById('about-section')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              About
            </button>
            <button
              className="nav-link"
              onClick={() =>
                document
                  .getElementById('rooms-section')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Rooms
            </button>
            <button
              className="nav-cta"
              onClick={() => setView('auth')}
            >
              {user ? 'Dashboard' : 'Login / Sign up'}
            </button>
          </nav>
        </header>

        {/* Main hero + info */}
        <main className="welcome-main">
          {/* Hero section */}
          <section className="welcome-hero">
            <div className="welcome-hero-main">
              <span className="welcome-pill">New • Academic Year Ready</span>
              <h1 className="welcome-title">ReserveIT</h1>
              <p className="welcome-tagline">
                Promote your campus rooms like a school advertisement —{' '}
                then manage reservations in one clean dashboard.
              </p>

              <p className="welcome-text">
                ReserveIT is a web-based room scheduler for schools and
                departments. Turn your classrooms, discussion rooms, and
                defense venues into organized, bookable spaces students
                actually understand.
              </p>

              <div className="welcome-buttons">
                <button
                  className="btn-primary"
                  onClick={() => setView('auth')}
                >
                  {user ? 'Continue as ' + user.username : 'Get Started'}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() =>
                    document
                      .getElementById('rooms-section')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  View Sample Rooms
                </button>
              </div>

              <div className="welcome-badges-row">
                <div className="welcome-badge">
                  <span className="badge-label">For Schools</span>
                  <span className="badge-desc">Thesis, defense, org events</span>
                </div>
                <div className="welcome-badge">
                  <span className="badge-label">Account-Based</span>
                  <span className="badge-desc">Each booking has a username</span>
                </div>
                <div className="welcome-badge">
                  <span className="badge-label">SQL + Node.js</span>
                  <span className="badge-desc">Backed by XAMPP MySQL</span>
                </div>
              </div>
            </div>

            {/* Collage of rooms on the right */}
            <aside className="welcome-hero-aside">
              <div className="hero-aside-header">
                <span className="hero-aside-tag">Featured Spaces</span>
                <span className="hero-aside-sub">
                  Sample layouts you can customize
                </span>
              </div>

              <div className="hero-room-mosaic">
                {ROOMS.slice(0, 3).map((room) => (
                  <article key={room.id} className="hero-room-tile">
                    <div className="hero-room-image-wrap">
                      <img
                        src={room.imageUrl}
                        alt={room.name}
                        className="hero-room-image"
                      />
                    </div>
                    <div className="hero-room-info">
                      <h3>{room.name}</h3>
                      <p className="hero-room-meta">
                        {room.capacity} · {room.location}
                      </p>
                      <p className="hero-room-caption">
                        Ideal for presentations, group work, and defenses.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </section>

          {/* About + Rooms sections */}
          <section id="about-section" className="welcome-section">
            <div className="section-left">
              <h2 className="section-heading">Why campuses use ReserveIT</h2>
              <p className="section-body">
                Instead of messy spreadsheets or scribbles on a whiteboard,
                ReserveIT gives you a clean, visual way to advertise and
                schedule rooms. Students and instructors can see room details,
                capacities, and who booked each slot — all in one place.
              </p>
            </div>

            <div className="section-grid">
              <div className="section-card">
                <h3>Clear room promotion</h3>
                <p>
                  Each room looks like a mini school poster: photo, capacity,
                  building, and highlights.
                </p>
              </div>
              <div className="section-card">
                <h3>Username-linked bookings</h3>
                <p>
                  Every reservation in the system stores the username, making it
                  easy for coordinators to track who booked what.
                </p>
              </div>
              <div className="section-card">
                <h3>SQL + Node.js backend</h3>
                <p>
                  Built on a simple Node/Express backend with MySQL in XAMPP —
                  easy to install and defend in a capstone.
                </p>
              </div>
            </div>
          </section>

          <section
            id="rooms-section"
            className="welcome-section welcome-rooms-section"
          >
            <div className="section-left">
              <h2 className="section-heading">Sample campus rooms</h2>
              <p className="section-body">
                These are example rooms powered by image URLs. Replace them with
                your own campus photos to turn ReserveIT into your school’s
                official room .
              </p>
            </div>

            <div className="welcome-rooms-grid">
              {ROOMS.map((room) => (
                <article key={room.id} className="welcome-room-card">
                  <div className="welcome-room-image-wrap">
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      className="welcome-room-image"
                    />
                  </div>
                  <div className="welcome-room-info">
                    <h3>{room.name}</h3>
                    <p className="welcome-room-meta">
                      {room.capacity} · {room.location}
                    </p>
                    <p className="welcome-room-desc">
                      Promote this space on your website, then manage its
                      reservations inside the dashboard.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // AUTH PAGE (LOGIN / REGISTER)
  if (view === 'auth') {
    return (
      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-badge">
              {authMode === 'login' ? 'Sign in' : 'Create account'}
            </div>
            <h1 className="auth-title">ReserveIT </h1>
            <p className="auth-text">
              {authMode === 'login'
                ? 'Use your account to access the campus room scheduler.'
                : 'Register a simple account to start booking rooms.'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label className="label">
              Username
              <input
                className="input"
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Enter username"
              />
            </label>
            <label className="label">
              Password
              <input
                className="input"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password"
              />
            </label>

            {authError && (
              <p className="auth-error">
                {authError}
              </p>
            )}

            <button type="submit" className="btn-primary auth-submit">
              {authMode === 'login' ? 'Login' : 'Sign up'}
            </button>
          </form>

          <div className="auth-footer-row">
            <button
              type="button"
              className="auth-switch"
              onClick={() =>
                setAuthMode((prev) =>
                  prev === 'login' ? 'register' : 'login'
                )
              }
            >
              {authMode === 'login'
                ? 'Need an account? Sign up'
                : 'Already registered? Login'}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => setView('welcome')}
            >
              ← Back to website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP (AFTER LOGIN)
  return (
    <div className="app-root">
      <div className="top-bar">
        <div className="top-brand">
          <span className="logo-dot" />
          <div>
            <span className="brand-text">ReserveIT</span>
            {user && (
              <div className="brand-sub">
                Signed in as <strong>{user.username}</strong>
              </div>
            )}
          </div>
        </div>
        <div className="top-actions">
          <button
            className="top-pill"
            onClick={() => setView('welcome')}
          >
            Website
          </button>
          <button
            className="top-pill top-pill-danger"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="home-layout">
        {/* LEFT: ROOM GALLERY */}
        <section className="panel left-panel">
          <div className="panel-header">
            <h2>Rooms</h2>
            <p>Click a room to focus its details in the reservation form.</p>
          </div>

          <div className="room-grid">
            {ROOMS.map((room) => (
              <div
                key={room.id}
                className={
                  'room-card ' +
                  (room.id === selectedRoomId ? 'room-card-active' : '')
                }
                onClick={() => setSelectedRoomId(room.id)}
              >
                <div className="room-image-wrap">
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="room-image"
                  />
                </div>
                <div className="room-info">
                  <div className="room-name-row">
                    <h3>{room.name}</h3>
                    {room.id === selectedRoomId && (
                      <span className="room-chip">Selected</span>
                    )}
                  </div>
                  <p className="room-meta">
                    <span>{room.capacity}</span> · <span>{room.location}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: FORM + RESERVATIONS */}
        <section className="panel right-panel">
          <div className="panel-header">
            <h2>Reserve {selectedRoom?.name}</h2>
            <p>
              Choose a date and time, describe the purpose, and save your
              reservation.
            </p>
          </div>

          <div className="right-content">
            {/* FORM */}
            <form className="reserve-form" onSubmit={handleReserve}>
              <div className="form-row">
                <label className="label">
                  Date
                  <input
                    type="date"
                    className="input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="label">
                  Start
                  <input
                    type="time"
                    className="input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label className="label">
                  End
                  <input
                    type="time"
                    className="input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
              </div>

              <label className="label">
                Purpose
                <textarea
                  className="input textarea"
                  placeholder="e.g. Project defense, org meeting, training session"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </label>

              <button type="submit" className="btn-primary full-width">
                {editingId ? 'Update Reservation' : 'Confirm Reservation'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="btn-ghost full-width"
                  style={{ marginTop: '4px' }}
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            {/* RESERVATIONS LIST */}
            <div className="reservation-section">
              <div className="reservation-header">
                <h3>Upcoming Reservations</h3>
                <span className="reservation-count">
                  {reservations.length} total
                </span>
              </div>

              {reservations.length === 0 ? (
                <p className="empty-text">
                  No reservations yet. Once you submit the form, they’ll appear
                  here.
                </p>
              ) : (
                <div className="reservation-list">
                  {reservations.map((item) => {
                    const isOwner =
                      user && item.username === user.username;

                    return (
                      <div key={item.id} className="reservation-card">
                        <div className="reservation-row">
                          <span className="reservation-room">
                            {item.roomName}
                          </span>
                          <span className="reservation-date">
                            {item.date}
                          </span>
                        </div>
                        <div className="reservation-row">
                          <span className="reservation-time">
                            {item.startTime} – {item.endTime}
                          </span>
                          <span className="reservation-time">
                            Booked by {item.username}
                          </span>
                        </div>
                        <p className="reservation-purpose">
                          {item.purpose}
                        </p>

                        <div className="reservation-row reservation-actions">
                          {isOwner ? (
                            <>
                              <button
                                type="button"
                                className="reservation-edit-btn"
                                onClick={() => handleEditClick(item)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="reservation-delete-btn"
                                onClick={() => handleDelete(item)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="reservation-note">
                              Only {item.username} can edit or delete this
                              booking
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
