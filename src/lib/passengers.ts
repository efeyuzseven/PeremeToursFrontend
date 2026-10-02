export type PassengerDetails = {
  firstName: string
  lastName: string
  gender: '' | 'male' | 'female'
  nationality: 'TR' | 'foreign'
  identityNumber: string
  birthDate: string
}

export const passengerTexts = {
  tr: {
    title: 'Yolcu bilgileri', hint: 'Her bilet için bir yolcunun bilgilerini gir. Bu bölümdeki tüm alanlar zorunludur.', passenger: 'Yolcu', firstName: 'Ad', lastName: 'Soyad',
    gender: 'Cinsiyet', selectGender: 'Cinsiyet seç', male: 'Erkek', female: 'Kadın', nationality: 'Uyruk', turkish: 'T.C.', foreign: 'Yabancı',
    identity: 'T.C. Kimlik / Pasaport No', birthDate: 'Doğum Tarihi', identityHint: 'T.C. kimlik numarası 11 haneli olmalı.',
    passportHint: 'Yabancı yolcular için pasaport numarasını gir.', invalid: 'Tüm yolcuların bilgilerini kontrol et. Cinsiyet seçimi, kimlik/pasaport numarası ve doğum tarihi zorunludur.',
  },
  en: {
    title: 'Passenger details', hint: 'Enter one passenger’s details for each ticket. All fields in this section are required.', passenger: 'Passenger', firstName: 'First name', lastName: 'Last name',
    gender: 'Gender', selectGender: 'Choose gender', male: 'Male', female: 'Female', nationality: 'Nationality', turkish: 'Turkish citizen', foreign: 'Foreign citizen',
    identity: 'Turkish ID / Passport No', birthDate: 'Date of birth', identityHint: 'Turkish ID numbers must have 11 digits.',
    passportHint: 'Enter the passport number for foreign passengers.', invalid: 'Please check every passenger’s details. Gender, ID/passport number and date of birth are required.',
  },
}

export function emptyPassenger(): PassengerDetails {
  return { firstName: '', lastName: '', gender: '', nationality: 'TR', identityNumber: '', birthDate: '' }
}

export function istanbulToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-')
}

export function isCompletePassenger(passenger: PassengerDetails, today: string) {
  const birthday = new Date(`${passenger.birthDate}T00:00:00Z`)
  return passenger.firstName.trim().length > 0 && passenger.lastName.trim().length > 0
    && ['male', 'female'].includes(passenger.gender)
    && (passenger.nationality === 'TR' ? /^[1-9][0-9]{10}$/.test(passenger.identityNumber)
      : passenger.identityNumber.trim().length >= 3 && passenger.identityNumber.trim().length <= 30)
    && /^\d{4}-\d{2}-\d{2}$/.test(passenger.birthDate)
    && !Number.isNaN(birthday.getTime()) && birthday.toISOString().slice(0, 10) === passenger.birthDate
    && passenger.birthDate >= '1900-01-01' && passenger.birthDate <= today
}

export function maskIdentity(value: string) {
  const identity = value.trim()
  return `•••• ${identity.slice(identity.length > 4 ? -4 : -2)}`
}
