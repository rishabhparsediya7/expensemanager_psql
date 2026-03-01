import nlp from "compromise"
import numbers from "compromise-numbers"

nlp.extend(numbers)

export interface DraftExpense {
  description: string
  amount: number
  expenseDate: string
}

/**
 * Parses raw text into a list of draft expenses using the compromise NLP library.
 * It splits the input by common delimiters and extracts descriptions and amounts.
 */
export const parseRawTextToDrafts = (text: string): DraftExpense[] => {
  // Split input by common delimiters: newlines, commas, or semicolons
  const fragments = text.split(/[\n,;]+/).filter((f) => f.trim() !== "")

  return fragments
    .map((line) => {
      const doc = nlp(line)

      // 1. Extract number (Amount)
      let amount: number | null = null
      const values = (doc as any).values().toNumber().json()
      if (values && values.length > 0) {
        amount = values[0].number
      }

      // Fallback: If compromise fails, try a simple regex for the first number found
      if (amount === null || isNaN(amount)) {
        const matches = line.match(/\d+(\.\d+)?/)
        if (matches) {
          amount = parseFloat(matches[0])
        }
      }

      // 2. Extract description (Name)
      let description = line
        .replace(/[0-9.,$₹:\-\\|/_]/g, "") // Remove numbers, currency symbols, and separators (:, -, |, etc.)
        .replace(/\b(spent|on|for|at|paid)\b/gi, "") // Remove filler words
        .replace(/\s+/g, " ") // Replace multiple spaces with a single space
        .trim()

      return description && amount !== null && !isNaN(amount)
        ? {
            description,
            amount: Number(amount),
            expenseDate: new Date().toISOString(),
          }
        : null
    })
    .filter((item): item is DraftExpense => item !== null)
}
