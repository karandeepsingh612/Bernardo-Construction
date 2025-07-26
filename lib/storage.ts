const ROLE_KEY = "user_role"

export function saveUserRole(role: string): void {
  try {
    localStorage.setItem(ROLE_KEY, role)
  } catch (error) {
    console.error("Failed to save user role:", error)
  }
}

export function loadUserRole(): string | null {
  try {
    return localStorage.getItem(ROLE_KEY)
  } catch (error) {
    console.error("Failed to load user role:", error)
    return null
  }
}
