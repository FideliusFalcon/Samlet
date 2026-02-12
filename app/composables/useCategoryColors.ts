export const CATEGORY_COLORS = [
  { value: 'gray', label: 'Grå', bg: 'bg-gray-100', text: 'text-gray-800' },
  { value: 'red', label: 'Rød', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-800' },
  { value: 'yellow', label: 'Gul', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { value: 'green', label: 'Grøn', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'teal', label: 'Turkis', bg: 'bg-teal-100', text: 'text-teal-800' },
  { value: 'blue', label: 'Blå', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  { value: 'purple', label: 'Lilla', bg: 'bg-purple-100', text: 'text-purple-800' },
] as const

export function useCategoryColors() {
  function colorClasses(color: string | null | undefined) {
    const c = CATEGORY_COLORS.find(cc => cc.value === color)
    return c ? `${c.bg} ${c.text}` : 'bg-gray-100 text-gray-800'
  }

  return { colors: CATEGORY_COLORS, colorClasses }
}
