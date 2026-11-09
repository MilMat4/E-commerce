export const formatPrice = (price) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(price || 0)

export const formatDate = (date) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
}).format(new Date(date))

export const imageUrl = (imagePath, apiOrigin) => {
  if (!imagePath) return null
  if (/^https?:\/\//i.test(imagePath)) return imagePath
  return `${apiOrigin}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
}
