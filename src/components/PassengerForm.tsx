import { passengerTexts, type PassengerDetails } from '../lib/passengers'
import { BookingSelect } from './BookingSelect'

export function PassengerForm({ index, ticketType, passenger, language, today, onChange }: {
  index: number; ticketType: string; passenger: PassengerDetails; language: 'tr' | 'en'; today: string
  onChange: (value: PassengerDetails) => void
}) {
  const c = passengerTexts[language]
  const namePrefix = `passenger-${index}`

  return <fieldset className="reservation-passenger">
    <legend>{index + 1}. {c.passenger}<span>{ticketType}</span></legend>
    <div className="reservation-passenger__fields">
      <label><span className="reservation-field-label">{c.firstName}</span><input name={`${namePrefix}-firstName`} autoComplete="off" required maxLength={80} value={passenger.firstName} onChange={(event) => onChange({ ...passenger, firstName: event.target.value })} /></label>
      <label><span className="reservation-field-label">{c.lastName}</span><input name={`${namePrefix}-lastName`} autoComplete="off" required maxLength={80} value={passenger.lastName} onChange={(event) => onChange({ ...passenger, lastName: event.target.value })} /></label>
      <BookingSelect label={c.gender} value={passenger.gender} placeholder={c.selectGender}
        options={[{ value: 'male', label: c.male }, { value: 'female', label: c.female }]}
        onChange={(value) => onChange({ ...passenger, gender: value as PassengerDetails['gender'] })} />
      <BookingSelect label={c.nationality} value={passenger.nationality}
        options={[{ value: 'TR', label: c.turkish }, { value: 'foreign', label: c.foreign }]}
        onChange={(value) => onChange({ ...passenger, nationality: value as PassengerDetails['nationality'], identityNumber: '' })} />
      <div><label><span className="reservation-field-label">{c.identity}</span><input name={`${namePrefix}-identity`} autoComplete="off" required aria-describedby={`${namePrefix}-identity-hint`}
        inputMode={passenger.nationality === 'TR' ? 'numeric' : 'text'}
        minLength={passenger.nationality === 'TR' ? 11 : 3} maxLength={passenger.nationality === 'TR' ? 11 : 30}
        pattern={passenger.nationality === 'TR' ? '[1-9][0-9]{10}' : undefined}
        value={passenger.identityNumber} onChange={(event) => onChange({ ...passenger, identityNumber: event.target.value })} /></label>
        <small className="reservation-helper" id={`${namePrefix}-identity-hint`}>{passenger.nationality === 'TR' ? c.identityHint : c.passportHint}</small></div>
      <label><span className="reservation-field-label">{c.birthDate}</span><input type="date" name={`${namePrefix}-birthDate`} autoComplete="off" required min="1900-01-01" max={today}
        value={passenger.birthDate} onChange={(event) => onChange({ ...passenger, birthDate: event.target.value })} /></label>
    </div>
  </fieldset>
}
