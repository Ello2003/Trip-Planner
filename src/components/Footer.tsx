import React, { useRef } from 'react';

interface FooterProps {
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onOpenTrash: () => void;
  onOpenActivityLog: () => void;
  onOpenGithubSync: () => void;
  onOpenBackupHistory: () => void;
  onOpenChangelog?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onExportBackup,
  onImportBackup,
  onOpenTrash,
  onOpenActivityLog,
  onOpenGithubSync,
  onOpenBackupHistory,
  onOpenChangelog
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
      e.target.value = '';
    }
  };

  return (
    <footer className="app-footer">
      <button className="footer-link" onClick={onExportBackup}>
        Export Backup
      </button>
      <span className="footer-sep">·</span>

      <label className="footer-link footer-import">
        Import Backup
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="application/json"
          onChange={handleFileChange}
        />
      </label>
      <span className="footer-sep">·</span>

      <button className="footer-link" onClick={onOpenTrash}>
        Trash
      </button>
      <span className="footer-sep">·</span>

      <button className="footer-link" onClick={onOpenActivityLog}>
        Activity Log
      </button>
      <span className="footer-sep">·</span>

      <button className="footer-link" onClick={onOpenGithubSync}>
        GitHub Sync
      </button>
      <span className="footer-sep">·</span>

      <button className="footer-link" onClick={onOpenBackupHistory}>
        Backup History
      </button>
      {onOpenChangelog && (
        <>
          <span className="footer-sep">·</span>
          <button className="footer-link" onClick={onOpenChangelog}>
            Version History
          </button>
        </>
      )}
    </footer>
  );
};
