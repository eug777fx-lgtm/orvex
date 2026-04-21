import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Download, FileText, Check, ArrowLeft } from 'lucide-react'
import Papa from 'papaparse'
import { importLeads } from '../utils/importLeads'
import { downloadSampleCSV } from '../utils/downloadSampleCSV'
import PageShell from '../components/PageShell'

const ORVEX_FIELDS = [
  { value: 'skip', label: '— skip —' },
  { value: 'company_name', label: 'Company Name' },
  { value: 'owner_name', label: 'Owner Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'location', label: 'Location' },
  { value: 'industry', label: 'Industry' },
  { value: 'website_url', label: 'Website URL' },
  { value: 'notes', label: 'Notes' },
]

const AUTO_MAP_RULES = [
  { match: ['company_name', 'business_name', 'business', 'company', 'name'], to: 'company_name' },
  { match: ['owner_name', 'owner', 'contact', 'contact_name'], to: 'owner_name' },
  { match: ['phone', 'tel', 'telephone', 'mobile', 'phone_number'], to: 'phone' },
  { match: ['email', 'email_address', 'e_mail'], to: 'email' },
  { match: ['location', 'address', 'city', 'town'], to: 'location' },
  { match: ['industry', 'category', 'type', 'sector'], to: 'industry' },
  { match: ['website_url', 'website', 'url', 'site'], to: 'website_url' },
  { match: ['notes', 'note', 'comments', 'description'], to: 'notes' },
]

const pageHeadingStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const pageSubStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.45)',
  marginTop: 6,
}

const glassCardStyle = {
  background: 'rgba(17,17,20,0.55)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const sectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '0.01em',
}

const sectionSubStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  marginTop: 2,
}

const solidButtonStyle = {
  width: '100%',
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.8)',
  borderRadius: 999,
  padding: '8px 18px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const selectStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#ffffff',
  padding: '8px 32px 8px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
}

const tableHeaderCell = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
  whiteSpace: 'nowrap',
}

const tableCellStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.75)',
  padding: '12px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function normalize(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function autoMap(headers) {
  const map = {}
  for (const header of headers) {
    const norm = normalize(header)
    let picked = 'skip'
    for (const rule of AUTO_MAP_RULES) {
      if (rule.match.includes(norm) || rule.match.some((m) => norm.includes(m))) {
        picked = rule.to
        break
      }
    }
    map[header] = picked
  }
  return map
}

function FlagCheckbox({ checked, label, onToggle }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: checked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${checked ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 13,
        color: checked ? '#ffffff' : 'rgba(255,255,255,0.6)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 5,
          border: `1px solid ${checked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
          background: checked ? '#ffffff' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <Check size={12} color="#000000" strokeWidth={3} />}
      </span>
      {label}
    </label>
  )
}

function UploadStep({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    const file = files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a .csv file')
      return
    }
    onFile(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        style={{
          border: `2px dashed ${
            dragging ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'
          }`,
          borderRadius: 16,
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(255,255,255,0.03)' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 14px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Upload size={24} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 500 }}>
          Drop your CSV file here
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            marginTop: 6,
          }}
        >
          or click to browse
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            marginTop: 14,
          }}
        >
          Accepts .csv files only
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button type="button" style={ghostButtonStyle} onClick={downloadSampleCSV}>
          <Download size={12} />
          Download Sample CSV
        </button>
      </div>
    </div>
  )
}

function PreviewStep({
  file,
  rows,
  headers,
  fieldMap,
  setFieldMap,
  options,
  setOptions,
  onReset,
  onImport,
}) {
  const preview = rows.slice(0, 5)
  const mappedFields = useMemo(() => {
    const list = []
    for (const [csvCol, orvexField] of Object.entries(fieldMap)) {
      if (orvexField && orvexField !== 'skip') list.push({ csvCol, orvexField })
    }
    return list
  }, [fieldMap])

  const readyCount = useMemo(() => {
    if (!fieldMap) return 0
    const hasName = Object.values(fieldMap).includes('company_name')
    if (!hasName) return 0
    const companyCol = Object.entries(fieldMap).find(
      ([, v]) => v === 'company_name',
    )?.[0]
    if (!companyCol) return 0
    return rows.filter((row) => String(row[companyCol] || '').trim() !== '').length
  }, [fieldMap, rows])

  function updateMap(csvCol, value) {
    setFieldMap({ ...fieldMap, [csvCol]: value })
  }

  function toggleOption(key) {
    setOptions({ ...options, [key]: !options[key] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <FileText size={16} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 360,
              }}
            >
              {file?.name || 'Uploaded file'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {rows.length} {rows.length === 1 ? 'row' : 'rows'} detected
            </div>
          </div>
        </div>
        <button type="button" style={ghostButtonStyle} onClick={onReset}>
          <ArrowLeft size={12} />
          Change File
        </button>
      </div>

      <div style={glassCardStyle}>
        <div style={{ marginBottom: 12 }}>
          <div style={sectionTitleStyle}>Map Your Columns</div>
          <div style={sectionSubStyle}>
            Match each CSV column to the right Orvex field
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {headers.map((header) => (
            <div
              key={header}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: '#ffffff',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {header}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>→</div>
              <select
                style={selectStyle}
                value={fieldMap[header] || 'skip'}
                onChange={(e) => updateMap(header, e.target.value)}
              >
                {ORVEX_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={sectionTitleStyle}>Preview (first 5 rows)</div>
          <div style={sectionSubStyle}>Using your column mapping</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {mappedFields.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 13,
              }}
            >
              Map at least one column to preview
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {mappedFields.map((mf) => (
                    <th key={mf.orvexField} style={tableHeaderCell}>
                      {ORVEX_FIELDS.find((f) => f.value === mf.orvexField)?.label ||
                        mf.orvexField}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    {mappedFields.map((mf) => {
                      const val = (row[mf.csvCol] || '').toString().trim()
                      return (
                        <td
                          key={mf.orvexField}
                          style={{
                            ...tableCellStyle,
                            color: val ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)',
                          }}
                        >
                          {val || '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={glassCardStyle}>
        <div style={{ marginBottom: 12 }}>
          <div style={sectionTitleStyle}>Auto-Score Settings</div>
          <div style={sectionSubStyle}>Rules applied during import</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FlagCheckbox
            checked={options.markNoWebsite}
            label='Mark as "no website" if website_url is empty'
            onToggle={() => toggleOption('markNoWebsite')}
          />
          <FlagCheckbox
            checked={options.autoScore}
            label="Set opportunity score automatically"
            onToggle={() => toggleOption('autoScore')}
          />
          <FlagCheckbox
            checked={options.setNewStatus}
            label='Set status to "new" for all imports'
            onToggle={() => toggleOption('setNewStatus')}
          />
          <FlagCheckbox
            checked={options.skipDuplicates}
            label="Skip duplicates (company + phone match)"
            onToggle={() => toggleOption('skipDuplicates')}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onImport}
        disabled={readyCount === 0}
        style={{
          ...solidButtonStyle,
          opacity: readyCount === 0 ? 0.4 : 1,
          cursor: readyCount === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        Import {readyCount} {readyCount === 1 ? 'Lead' : 'Leads'}
      </button>
    </div>
  )
}

function ProgressStep({ progress, total }) {
  const pct = total === 0 ? 0 : Math.round((progress / total) * 100)
  return (
    <div
      style={{
        ...glassCardStyle,
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
        Importing {progress} of {total} leads...
      </div>
      <div
        style={{
          marginTop: 20,
          width: '100%',
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'rgba(255,255,255,0.8)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
        {pct}%
      </div>
    </div>
  )
}

function DoneStep({ result, onViewLeads, onAnother }) {
  return (
    <div
      style={{
        ...glassCardStyle,
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Check size={28} color="#ffffff" strokeWidth={2.5} />
      </div>
      <div
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.01em',
        }}
      >
        Import Complete
      </div>
      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
            {result.imported}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            leads imported
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
            {result.skipped}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            duplicates skipped
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
            {result.errors}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            errors
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: 14,
        }}
      >
        <button type="button" style={ghostButtonStyle} onClick={onAnother}>
          Import Another
        </button>
        <button
          type="button"
          style={{
            ...solidButtonStyle,
            width: 'auto',
            padding: '8px 22px',
            fontSize: 13,
          }}
          onClick={onViewLeads}
        >
          View Leads
        </button>
      </div>
    </div>
  )
}

const INITIAL_OPTIONS = {
  markNoWebsite: true,
  autoScore: true,
  setNewStatus: true,
  skipDuplicates: true,
}

export default function Import() {
  const navigate = useNavigate()
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [fieldMap, setFieldMap] = useState({})
  const [options, setOptions] = useState(INITIAL_OPTIONS)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState({ imported: 0, skipped: 0, errors: 0 })
  const [parseError, setParseError] = useState(null)

  function resetAll() {
    setFile(null)
    setRows([])
    setHeaders([])
    setFieldMap({})
    setOptions(INITIAL_OPTIONS)
    setProgress({ current: 0, total: 0 })
    setResult({ imported: 0, skipped: 0, errors: 0 })
    setParseError(null)
    setStep('upload')
  }

  function handleFile(selectedFile) {
    setParseError(null)
    setFile(selectedFile)
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const fields = results.meta?.fields || []
        const data = results.data || []
        if (fields.length === 0 || data.length === 0) {
          setParseError('No rows found in CSV.')
          return
        }
        setHeaders(fields)
        setRows(data)
        setFieldMap(autoMap(fields))
        setStep('preview')
      },
      error: (err) => {
        console.error(err)
        setParseError(err?.message || 'Failed to parse CSV.')
      },
    })
  }

  async function runImport() {
    const companyCol = Object.entries(fieldMap).find(
      ([, v]) => v === 'company_name',
    )?.[0]
    if (!companyCol) return

    const eligible = rows.filter(
      (r) => String(r[companyCol] || '').trim() !== '',
    )
    setProgress({ current: 0, total: eligible.length })
    setResult({ imported: 0, skipped: 0, errors: 0 })
    setStep('importing')

    try {
      const res = await importLeads(
        rows,
        fieldMap,
        {
          autoScore: options.autoScore,
          skipDuplicates: options.skipDuplicates,
          defaultStatus: options.setNewStatus ? 'new' : 'new',
          markNoWebsite: options.markNoWebsite,
        },
        (current, total) => setProgress({ current, total }),
      )
      setResult(res)
    } catch (err) {
      console.error(err)
      setResult((prev) => ({ ...prev, errors: prev.errors + 1 }))
    } finally {
      setStep('done')
    }
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={pageHeadingStyle}>Import Leads</h2>
        <p style={pageSubStyle}>Bulk upload businesses from a CSV file</p>
      </div>

      {parseError && (
        <div
          style={{
            fontSize: 13,
            color: '#ff8888',
            background: 'rgba(255, 80, 80, 0.08)',
            border: '1px solid rgba(255, 80, 80, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          {parseError}
        </div>
      )}

      {step === 'upload' && <UploadStep onFile={handleFile} />}

      {step === 'preview' && (
        <PreviewStep
          file={file}
          rows={rows}
          headers={headers}
          fieldMap={fieldMap}
          setFieldMap={setFieldMap}
          options={options}
          setOptions={setOptions}
          onReset={resetAll}
          onImport={runImport}
        />
      )}

      {step === 'importing' && (
        <ProgressStep progress={progress.current} total={progress.total} />
      )}

      {step === 'done' && (
        <DoneStep
          result={result}
          onViewLeads={() =>
            navigate('/leads', { state: { imported: result.imported } })
          }
          onAnother={resetAll}
        />
      )}
    </PageShell>
  )
}
