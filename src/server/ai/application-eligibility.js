/** Rule-based application screening (works without OpenAI). */

function missing(field) {
  const value = String(field ?? '').trim()
  return value.length === 0
}

export function assessApplicationEligibility(application) {
  const type = application?.applicationType
  const fields = application?.payload || {}
  const issues = []
  const strengths = []

  if (type === 'seller') {
    if (missing(fields.farmName)) issues.push('Farm or shop name is missing.')
    else strengths.push('Farm name provided.')
    if (missing(fields.location)) issues.push('Location is missing.')
    else strengths.push('Location provided.')
    if (missing(fields.contactNumber)) issues.push('Contact number is missing or too short.')
    if (String(fields.description ?? '').trim().length < 10) {
      issues.push('Business description is too short (need at least ~10 characters).')
    } else strengths.push('Description provided.')
    if (missing(fields.categories)) issues.push('Product categories not listed.')
  } else if (type === 'delivery') {
    if (missing(fields.fullName)) issues.push('Full name is missing.')
    if (missing(fields.contactNumber)) issues.push('Contact number is missing or too short.')
    if (String(fields.serviceArea ?? '').trim().length < 3) {
      issues.push('Service area is too vague — couriers need a clear coverage area.')
    } else strengths.push('Service area described.')
    if (String(fields.experience ?? '').trim().length < 5) {
      issues.push('Delivery experience / vehicle notes are minimal.')
    }
  } else {
    issues.push('Unknown application type.')
  }

  let category = 'Complete — Ready for Human Review'
  if (issues.length >= 3) category = 'Requires Additional Review'
  else if (issues.length >= 1) category = 'Missing Information'

  const eligibleHint =
    issues.length === 0
      ? 'Likely eligible pending your manual verification of documents and identity.'
      : 'Not ready to approve until missing items are addressed.'

  return {
    category,
    eligibleHint,
    issues,
    strengths,
    issueCount: issues.length,
  }
}

export function formatEligibilityAnswer(assessment, application) {
  const lines = [
    `Application type: ${application.applicationType}`,
    `Status: ${application.status}`,
    `Screening: ${assessment.category}`,
    assessment.eligibleHint,
  ]
  if (assessment.strengths.length) {
    lines.push('', 'Strengths:', ...assessment.strengths.map((s) => `• ${s}`))
  }
  if (assessment.issues.length) {
    lines.push('', 'Issues to resolve:', ...assessment.issues.map((s) => `• ${s}`))
  }
  lines.push('', 'You must still approve or reject manually in the dashboard.')
  return lines.join('\n')
}
