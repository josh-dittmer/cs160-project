"use client";
import "./profile.css";
import TopBar from "@/components/top-bar/top-bar";
import Sidebar from "@/components/sidebar/sidebar";
import { useState } from "react";
import EditProfilePanel from "./EditProfilePanel";

export default function ProfilePage() {

  const [editMode, setEditMode] = useState(false);

  // TODO: need to connect to backend and save user's image
  const [selectedImage, setSelectedImage] = useState("/profile_image.jpg");

  // choose image from user's computer
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file){
        const imageURL = URL.createObjectURL(file);
        setSelectedImage(imageURL);
    }
  }


  return (
    <>
      <TopBar />
      <div className="grid grid-cols-[75px_auto] md:grid-cols-[200px_auto] overflow-hidden h-[calc(100vh-64px)]">
        <div className="relative border-bg-dark border-r bg-bg-light p-3">
          <Sidebar />
        </div>

        <main className="p-8 overflow-y-auto">
          <header className="profile-header">
            <h1>Profile</h1>
          </header>

          <section className="profile-grid">
            {/* Left card (inline) */}
            <article className="card profile-card">
              <div className="avatar-wrap">
                <img src={selectedImage} alt="User avatar" className="avatar" />

                <input 
                    type="file"
                    id="avatarInput"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{display: "none"}}
                />
                <button className="avatar-edit" aria-label="Edit photo" onClick={() => document.getElementById("avatarInput")?.click()}>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41L18.37 3.29a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              </div>
              <h2 className="name">Stella</h2>
              <p className="address">
                1 Washington Sq
                <br /> San Jose, CA 95192
              </p>
            </article>

            {/* Right pane: view vs edit */}
            {!editMode ? (
              <article className="card info-card">
                <div className="info-card__bar">
                  <h3>User Information</h3>
                  <button className="btn btn-primary" type="button" onClick={() => setEditMode(true)}>
                    Edit
                  </button>
                </div>

                <div className="info-grid">
                  <div className="info-field">
                    <span className="label">Name</span>
                    <span className="value">Stella J</span>
                  </div>
                  <div className="info-field">
                    <span className="label">E-Mail</span>
                    <span className="value">stellajiangwork@gmail.com</span>
                  </div>
                  <div className="info-field">
                    <span className="label">Phone</span>
                    <span className="value">510-123 1234</span>
                  </div>
                  <div className="info-field">
                    <span className="label">Password</span>
                    <span className="value ok">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                      </svg>
                      Password has been set
                    </span>
                  </div>
                </div>
              </article>
            ) : (
              <EditProfilePanel onCancel={() => setEditMode(false)} />
            )}
          </section>
        </main>
      </div>
    </>
  );
}
