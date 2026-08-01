// src/pages/osas/OsasAccounts.jsx
//
// Account management: lists OSAS admin accounts (editable, deletable --
// except your own while logged in) and student accounts (viewable,
// deletable for graduated/unenrolled students).

import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function OsasAccounts() {
  const { fullName } = useAuth();
  const [tab, setTab] = useState("osas"); // "osas" | "students"

  const [osasAccounts, setOsasAccounts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    Promise.all([api.osas.listAccounts(), api.osas.listStudents()])
      .then(([accounts, studentList]) => {
        setOsasAccounts(accounts);
        setStudents(studentList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function startEdit(account) {
    setEditingId(account.id);
    setEditForm({ full_name: account.full_name, position: account.position || "" });
  }

  async function saveEdit(accountId) {
    try {
      await api.osas.updateAccount(accountId, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteOsas(accountId) {
    if (!window.confirm("Remove this OSAS account?")) return;
    try {
      await api.osas.deleteAccount(accountId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStudent(studentId) {
    if (!window.confirm("Remove this student account? This also removes their status updates, reviews, and concerns.")) return;
    try {
      await api.osas.deleteStudent(studentId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleArchiveStudent(studentId) {
    if (!window.confirm("Archive this student? They'll be marked inactive but kept in the system.")) return;
    try {
      await api.osas.archiveStudent(studentId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUnarchiveStudent(studentId) {
    try {
      await api.osas.unarchiveStudent(studentId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Account management</div>
          <div className="osas-main-sub">Manage OSAS staff accounts and registered student accounts.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button className={`btn ${tab === "osas" ? "primary" : ""}`} onClick={() => setTab("osas")}>
          OSAS staff ({osasAccounts.length})
        </button>
        <button className={`btn ${tab === "students" ? "primary" : ""}`} onClick={() => setTab("students")}>
          Students ({students.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-text">Loading...</div>
      ) : tab === "osas" ? (
        <div className="card">
          <div className="panel-title">OSAS staff accounts</div>
          <table>
            <tbody>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Status</th>
                <th></th>
              </tr>
              {osasAccounts.map((a) => (
                <tr key={a.id}>
                  {editingId === a.id ? (
                    <>
                      <td><input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} style={{ width: "100%", fontSize: 12, padding: 4 }} /></td>
                      <td style={{ fontSize: 12, color: "#a39c8a" }}>{a.email}</td>
                      <td><input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} style={{ width: "100%", fontSize: 12, padding: 4 }} /></td>
                      <td>{a.full_name === fullName && <span className="badge ok">You</span>}</td>
                      <td>
                        <button className="btn primary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => saveEdit(a.id)}>Save</button>{" "}
                        <button className="btn" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{a.full_name}</td>
                      <td style={{ fontSize: 12, color: "#857d6c" }}>{a.email}</td>
                      <td>{a.position || "-"}</td>
                      <td>{a.full_name === fullName && <span className="badge ok">You</span>}</td>
                      <td>
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 11, marginRight: 4 }} onClick={() => startEdit(a)}>Edit</button>
                        {a.full_name !== fullName && (
                          <button className="btn" style={{ padding: "5px 10px", fontSize: 11, color: "var(--pin)" }} onClick={() => handleDeleteOsas(a.id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#a39c8a", marginTop: 10 }}>
            New OSAS accounts are created through the registration form on the OSAS login page.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="panel-title">Student accounts</div>
          {students.length === 0 ? (
            <div className="review-empty">No students registered yet.</div>
          ) : (
            <table>
              <tbody>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Course &amp; section</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr>
                {students.map((s) => (
                  <tr key={s.id} style={s.is_archived ? { opacity: 0.6 } : undefined}>
                    <td>{s.full_name}</td>
                    <td style={{ fontSize: 12, color: "#857d6c" }}>{s.email}</td>
                    <td>{s.course_section || "-"}</td>
                    <td style={{ fontSize: 12, color: "#a39c8a" }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {s.is_archived ? (
                        <span className="badge pending">Archived</span>
                      ) : (
                        <span className="badge ok">Active</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {s.is_archived ? (
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 11, marginRight: 4 }} onClick={() => handleUnarchiveStudent(s.id)}>
                          Unarchive
                        </button>
                      ) : (
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 11, marginRight: 4 }} onClick={() => handleArchiveStudent(s.id)}>
                          Archive
                        </button>
                      )}
                      <button className="btn" style={{ padding: "5px 10px", fontSize: 11, color: "var(--pin)" }} onClick={() => handleDeleteStudent(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: 11, color: "#a39c8a", marginTop: 10 }}>
            Students are automatically archived after 3 years without a boarding-house status
            update, and permanently deleted 5 years after that if still inactive.
          </div>
        </div>
      )}
    </>
  );
}
