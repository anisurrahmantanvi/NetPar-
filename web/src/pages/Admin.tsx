import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, CheckCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReportItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const Admin: React.FC = () => {
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'reports'));
      const list: ReportItem[] = [];
      snap.forEach(d => list.push({ ...d.data(), reportId: d.id } as ReportItem));
      setReports(list);
    } catch (e) {
      console.warn("Reports fetch note:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    fetchReports();
  }, [isAdmin]);

  const handleResolve = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setReports(prev => prev.map(r => r.reportId === reportId ? { ...r, status: 'resolved' } : r));
    } catch (err: any) {
      alert("Failed to resolve: " + err.message);
    }
  };

  const handleDeleteContent = async (report: ReportItem) => {
    if (!window.confirm("Permanently delete this reported item?")) return;
    try {
      if (report.targetType === 'post') {
        await deleteDoc(doc(db, 'posts', report.targetId));
      }
      await updateDoc(doc(db, 'reports', report.reportId), { status: 'resolved' });
      setReports(prev => prev.map(r => r.reportId === report.reportId ? { ...r, status: 'resolved' } : r));
      alert("Content removed successfully.");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="main-feed-area" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Shield size={24} color="var(--accent-rose)" />
        <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Admin Moderation Console</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-border)' }}>
          <CheckCircle size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Clean Record</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>No pending user reports or moderation flags.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => (
            <div 
              key={r.reportId}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--accent-rose)' }}>
                  ⚠️ {r.reason}
                </span>
                <span style={{ fontSize: '0.78rem', background: r.status === 'resolved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.status === 'resolved' ? 'var(--accent-emerald)' : 'var(--accent-rose)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {r.status}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{r.description || 'No description provided.'}</p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target: {r.targetType} ({r.targetId})</div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                {r.targetType === 'post' && (
                  <button
                    onClick={() => navigate(`/post/${r.targetId}`)}
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ExternalLink size={14} /> View Post
                  </button>
                )}
                {r.status !== 'resolved' && (
                  <>
                    <button
                      onClick={() => handleResolve(r.reportId)}
                      style={{ background: 'var(--accent-emerald)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => handleDeleteContent(r)}
                      style={{ background: 'var(--accent-rose)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={14} /> Delete Content
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
