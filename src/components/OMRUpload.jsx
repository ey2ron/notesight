import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OMRUpload.css';

const CARD_OVERLAY_GRADIENT = 'linear-gradient(160deg, rgba(255, 251, 223, 0.96) 0%, rgba(255, 255, 255, 0.78) 46%, rgba(143, 185, 150, 0.34) 100%)';

export function OMRUpload({ layout = 'standalone', inputId = 'omr-file', backgroundImage } = {}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [xmlResult, setXmlResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [downloadFileName, setDownloadFileName] = useState('audiveris-output.mxl');
  const [infoMessage, setInfoMessage] = useState('');
  const navigate = useNavigate();
  const apiBaseUrl = useMemo(() => {
    const fallback = import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://lophodont-conjugally-nathanial.ngrok-free.dev';
    const raw = import.meta.env.VITE_API_URL ?? fallback;
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  }, []);

  const rootClassName = layout === 'embedded'
    ? 'omr-upload-root omr-upload-root--embedded'
    : 'omr-upload-root omr-upload-root--standalone';
  const cardClassName = layout === 'embedded' ? 'omr-card omr-card--embedded' : 'omr-card';

  const cardStyle = backgroundImage
    ? {
        backgroundImage: `${CARD_OVERLAY_GRADIENT}, url(${backgroundImage})`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
      }
    : undefined;

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] ?? null);
    setErrorMessage('');
    setXmlResult('');
    setErrorDetails('');
    setDownloadBlob(null);
    setInfoMessage('');
  };

  const extractFileName = (contentDisposition) => {
    const fileNameMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
    if (fileNameMatch && fileNameMatch[1]) {
      return fileNameMatch[1];
    }
    return null;
  };

  const convertScore = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please pick a PNG, JPG, or PDF file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsLoading(true);
    setErrorMessage('');
    setXmlResult('');
    setErrorDetails('');
    setDownloadBlob(null);
    setInfoMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/convert`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        setErrorMessage(details.message ?? 'Conversion failed');
        setErrorDetails(details.details ?? '');
        setDownloadBlob(null);
        setDownloadFileName('audiveris-output.mxl');
        return;
      }

      const blob = await response.blob();
      const contentType = response.headers.get('Content-Type') ?? '';
      const contentDisposition = response.headers.get('Content-Disposition') ?? '';
      const suggestedName = extractFileName(contentDisposition) ?? 'audiveris-output.mxl';
      const lowerName = suggestedName.toLowerCase();
      const isMxlResponse = lowerName.endsWith('.mxl');

      let resultBlob = blob;
      let resultFileName = suggestedName;

      if (!isMxlResponse && contentType.includes('xml')) {
        const xmlText = await blob.text();
        resultBlob = new Blob([xmlText], { type: 'application/xml' });
        resultFileName = lowerName.endsWith('.xml') ? suggestedName : 'audiveris-output.xml';
      }

      setDownloadBlob(resultBlob);
      setDownloadFileName(resultFileName);
      setXmlResult('');
      setInfoMessage('');
      setErrorDetails('');

      navigate('/xmlplayer', {
        state: {
          scoreBlob: resultBlob,
          fileName: resultFileName,
        },
        replace: false,
      });
    } catch (error) {
      setErrorMessage(error.message ?? 'Unexpected error');
      setDownloadBlob(null);
      setDownloadFileName('audiveris-output.mxl');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadXml = () => {
    if (!downloadBlob && !xmlResult) {
      return;
    }
    let blob = downloadBlob;
    let fileName = downloadFileName;

    if (!blob && xmlResult) {
      blob = new Blob([xmlResult], { type: 'application/xml' });
      fileName = 'audiveris-output.xml';
    }

    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={rootClassName}>
      <section className={cardClassName} aria-busy={isLoading} style={cardStyle}>
        {isLoading && (
          <div className="omr-loader" role="status" aria-live="polite">
            <span className="omr-spinner" />
            <span className="omr-loader__label">Converting…</span>
          </div>
        )}

        <header className="omr-card__header">
          <p className="omr-card__eyebrow">Optical Music Recognition</p>
          <h1 className="omr-card__title">Convert Sheet Music to MusicXML</h1>
          <p className="omr-card__subtitle">
            Upload your score and let Audiveris deliver a clean, editable MusicXML file.
          </p>
        </header>

        <form className="omr-form" onSubmit={convertScore}>
          <label className="omr-field" htmlFor={inputId}>
            <span className="omr-field__label">Score file</span>
            <span className="omr-field__hint">PNG, JPG, or PDF up to 64 MB</span>
            <input
              className="omr-field__input"
              id={inputId}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            {selectedFile && <span className="omr-field__file">Selected: {selectedFile.name}</span>}
          </label>

          <button type="submit" className="omr-submit" disabled={isLoading}>
            {isLoading ? 'Converting…' : 'Convert to MusicXML'}
          </button>
        </form>

        <div className="omr-feedback">
          {errorMessage && <p className="omr-alert omr-alert--error">{errorMessage}</p>}
          {infoMessage && !errorMessage && <p className="omr-alert omr-alert--info">{infoMessage}</p>}
          {errorDetails && (
            <details className="omr-log">
              <summary>Conversion log</summary>
              <pre>{errorDetails}</pre>
            </details>
          )}
        </div>

        {xmlResult && (
          <section className="omr-panel" aria-live="polite">
            <div className="omr-panel__header">
              <h2>MusicXML Output</h2>
              <button type="button" className="omr-button" onClick={downloadXml}>
                Download
              </button>
            </div>
            <textarea
              className="omr-textarea"
              value={xmlResult}
              readOnly
              rows={14}
              spellCheck={false}
            />
          </section>
        )}

        {!xmlResult && downloadBlob && (
          <section className="omr-panel" aria-live="polite">
            <div className="omr-panel__header">
              <h2>Download MusicXML</h2>
              <button type="button" className="omr-button" onClick={downloadXml}>
                Download
              </button>
            </div>
            <p className="omr-panel__body">
              Your conversion is ready as a compressed MusicXML (.mxl) file.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
