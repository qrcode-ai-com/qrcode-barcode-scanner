// SPDX-License-Identifier: MIT
// Every string the panel shows, in US English, with a note for Canva's translators. The build
// extracts them into dist/messages_en.json, the file Canva's Developer Portal takes for
// translation. Format names (QR Code, Code 128 and so on) are proper names and stay as they are.
import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  title: {
    id: 'scanner.title',
    defaultMessage: 'Read the codes in an image',
    description: 'Heading at the top of the app panel.',
  },
  intro: {
    id: 'scanner.intro',
    defaultMessage: 'Select an image in your design, then scan it to see which QR codes and barcodes it holds and their exact text.',
    description: 'First paragraph of the app panel, under the heading.',
  },
  original: {
    id: 'scanner.original',
    defaultMessage: 'The app reads the original image file you placed, at full size. Cropping, filters, and anything layered over the image on the page are not applied.',
    description: 'Note under the intro explaining what part of the design is read.',
  },
  loading: {
    id: 'scanner.loading',
    defaultMessage: 'Loading the scanner…',
    description: 'Status shown while the scanning engine starts, before the first scan.',
  },
  selectedNone: {
    id: 'scanner.selected.none',
    defaultMessage: 'No image selected. Select an image in your design.',
    description: 'Status when the user has not selected any image in the design.',
  },
  selectedSome: {
    id: 'scanner.selected.some',
    defaultMessage: '{count, plural, one {# image selected} other {# images selected}}',
    description: 'Status showing how many images are selected in the design.',
  },
  selectedMany: {
    id: 'scanner.selected.many',
    defaultMessage: 'The first {max} images are read.',
    description: 'Note shown when more images are selected than the app reads in one scan.',
  },
  profile: {
    id: 'scanner.profile',
    defaultMessage: 'Profile',
    description: 'Label of the control that chooses how thoroughly the image is read.',
  },
  profileHelp: {
    id: 'scanner.profile.help',
    defaultMessage: 'Full reads the most and also scores QR codes. Fast suits clear images. Frame is the quickest.',
    description: 'Help text under the profile control.',
  },
  profileFast: { id: 'scanner.profile.fast', defaultMessage: 'Fast', description: 'Name of the fast scanning profile.' },
  profileFrame: { id: 'scanner.profile.frame', defaultMessage: 'Frame', description: 'Name of the quickest scanning profile, which decodes without scoring.' },
  profileFull: { id: 'scanner.profile.full', defaultMessage: 'Full', description: 'Name of the most thorough scanning profile.' },
  expected: {
    id: 'scanner.expected',
    defaultMessage: 'Expected text',
    description: 'Label of an optional text field where the user types the text a code should hold.',
  },
  expectedHelp: {
    id: 'scanner.expected.help',
    defaultMessage: 'Optional. Each code is compared with it, character for character.',
    description: 'Help text under the expected text field.',
  },
  scan: {
    id: 'scanner.scan',
    defaultMessage: 'Scan selected image',
    description: 'Main button that reads the selected image.',
  },
  scanning: {
    id: 'scanner.scanning',
    defaultMessage: 'Reading {count, plural, one {the image} other {# images}} with the {profile} profile…',
    description: 'Status while a scan runs. {profile} is the name of the chosen profile.',
  },
  found: {
    id: 'scanner.found',
    defaultMessage: '{count, plural, one {Found # code.} other {Found # codes.}}',
    description: 'Summary after a scan that found codes.',
  },
  empty: {
    id: 'scanner.empty',
    defaultMessage: 'No QR code or barcode found in the selected image.',
    description: 'Summary after a scan that found nothing.',
  },
  inconclusive: {
    id: 'scanner.inconclusive',
    defaultMessage: 'The scan stopped at its time limit before it finished. Try the fast profile or a smaller image.',
    description: 'Summary when the scan ran out of time.',
  },
  imageHeading: {
    id: 'scanner.image.heading',
    defaultMessage: 'Image {number}: {format}, {size} KB',
    description: 'Heading above the results of one image. {format} is a file format such as PNG.',
  },
  kindUrl: { id: 'scanner.kind.url', defaultMessage: 'Link', description: 'Kind of content: a web address.' },
  kindWifi: { id: 'scanner.kind.wifi', defaultMessage: 'Wi-Fi network', description: 'Kind of content: Wi-Fi login details.' },
  kindEmail: { id: 'scanner.kind.email', defaultMessage: 'Email', description: 'Kind of content: an email address or message.' },
  kindSms: { id: 'scanner.kind.sms', defaultMessage: 'Text message', description: 'Kind of content: an SMS.' },
  kindTel: { id: 'scanner.kind.tel', defaultMessage: 'Phone number', description: 'Kind of content: a phone number.' },
  kindGeo: { id: 'scanner.kind.geo', defaultMessage: 'Location', description: 'Kind of content: map coordinates.' },
  kindGs1: { id: 'scanner.kind.gs1', defaultMessage: 'GS1 element string', description: 'Kind of content: GS1 product data. GS1 is a proper name.' },
  kindGs1DigitalLink: { id: 'scanner.kind.gs1_digital_link', defaultMessage: 'GS1 Digital Link', description: 'Kind of content: a GS1 Digital Link address. Proper name.' },
  kindMeCard: { id: 'scanner.kind.me_card', defaultMessage: 'Contact (MECARD)', description: 'Kind of content: a contact card in MECARD format.' },
  kindCrypto: { id: 'scanner.kind.crypto', defaultMessage: 'Payment address', description: 'Kind of content: a cryptocurrency payment address.' },
  kindVCard: { id: 'scanner.kind.v_card', defaultMessage: 'Contact (vCard)', description: 'Kind of content: a contact card in vCard format.' },
  kindVEvent: { id: 'scanner.kind.v_event', defaultMessage: 'Calendar event', description: 'Kind of content: a calendar event.' },
  kindText: { id: 'scanner.kind.text', defaultMessage: 'Text', description: 'Kind of content: plain text.' },
  hidden: {
    id: 'scanner.hidden',
    defaultMessage: '{count, plural, one {# invisible character is shown by its code point.} other {# invisible characters are shown by their code points.}}',
    description: 'Warning under a decoded text that holds characters which cannot be seen.',
  },
  lossy: {
    id: 'scanner.lossy',
    defaultMessage: 'Some bytes are not text in a known character set.',
    description: 'Warning under a decoded text whose bytes could not all be read as text.',
  },
  matches: { id: 'scanner.matches', defaultMessage: 'Matches', description: 'Badge: the decoded text equals the expected text.' },
  differs: { id: 'scanner.differs', defaultMessage: 'Differs', description: 'Badge: the decoded text is not the expected text.' },
  untrusted: {
    id: 'scanner.untrusted',
    defaultMessage: 'Decoded text comes from the image. The app shows it as text and never opens a link.',
    description: 'Note under the results.',
  },
  showReport: { id: 'scanner.report.show', defaultMessage: 'Show the full report', description: 'Button that shows the engine report as JSON.' },
  hideReport: { id: 'scanner.report.hide', defaultMessage: 'Hide the full report', description: 'Button that hides the engine report.' },
  errorNoSelection: {
    id: 'scanner.error.no_selection',
    defaultMessage: 'Select an image in your design first.',
    description: 'Error when the user scans without an image selected.',
  },
  errorSelection: {
    id: 'scanner.error.selection',
    defaultMessage: 'The selected image could not be read from the design. Select it again.',
    description: 'Error when Canva could not give the selected image.',
  },
  errorNetwork: {
    id: 'scanner.error.network',
    defaultMessage: 'The image file could not be downloaded from Canva. Check your connection and try again.',
    description: 'Error when the image download failed.',
  },
  errorHttp: {
    id: 'scanner.error.http',
    defaultMessage: 'Canva did not return the image file (status {status}). Try again.',
    description: 'Error when the image download returned an HTTP error status.',
  },
  errorTooLarge: {
    id: 'scanner.error.too_large',
    defaultMessage: 'The image file is larger than 32 MB, which this app does not read.',
    description: 'Error for an image file that is too large.',
  },
  errorUnsupported: {
    id: 'scanner.error.unsupported',
    defaultMessage: 'This image is in a format the scanner does not read ({format}). It reads PNG, JPEG, WebP and GIF.',
    description: 'Error for an image format the scanner cannot read. {format} is a short format name such as SVG.',
  },
  errorScan: {
    id: 'scanner.error.scan',
    defaultMessage: 'The scanner could not read this image: {detail}',
    description: 'Error when the engine refused the image. {detail} is a technical message.',
  },
  errorEngine: {
    id: 'scanner.error.engine',
    defaultMessage: 'The scanner could not start in this browser: {detail}',
    description: 'Error when the scanning engine could not load.',
  },
  about: {
    id: 'scanner.about',
    defaultMessage: 'Open-source QR Code & Barcode Scanner by QR Code AI, engine {version}. It runs in this panel: the image is not uploaded anywhere.',
    description: 'Footer. QR Code & Barcode Scanner and QR Code AI are names. {version} is a version number.',
  },
  license: {
    id: 'scanner.license',
    defaultMessage: 'The engine is licensed AGPL-3.0-or-later; its source code is public.',
    description: 'Footer license notice. AGPL-3.0-or-later is the name of a license and stays as it is.',
  },
  source: {
    id: 'scanner.source',
    defaultMessage: 'Source code and licenses',
    description: 'Button in the footer that opens the public source code repository in a new tab.',
  },
});

export const KIND_MESSAGES = {
  url: messages.kindUrl,
  wifi: messages.kindWifi,
  email: messages.kindEmail,
  sms: messages.kindSms,
  tel: messages.kindTel,
  geo: messages.kindGeo,
  gs1: messages.kindGs1,
  gs1_digital_link: messages.kindGs1DigitalLink,
  me_card: messages.kindMeCard,
  crypto: messages.kindCrypto,
  v_card: messages.kindVCard,
  v_event: messages.kindVEvent,
  text: messages.kindText,
};
