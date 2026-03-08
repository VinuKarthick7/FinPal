import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'

// ── Mock contacts (simulating phone contact list) ──────────────────
interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string          // URL – falls back to initials
  upiId?: string | null    // null → UPI not registered
  online?: boolean         // blue dot indicator
}

const MOCK_CONTACTS: Contact[] = [
  { id: '1',  name: 'Aarav Sharma',    phone: '+91 98765 43210', upiId: 'aarav@oksbi',      online: true },
  { id: '2',  name: 'Priya Patel',     phone: '+91 87654 32109', upiId: 'priya@okaxis',     online: false },
  { id: '3',  name: 'Rohan Mehta',     phone: '+91 76543 21098', upiId: null,                online: false },
  { id: '4',  name: 'Sneha Reddy',     phone: '+91 65432 10987', upiId: 'sneha@ybl',        online: true },
  { id: '5',  name: 'Vikram Singh',    phone: '+91 54321 09876', upiId: 'vikram@paytm',     online: false },
  { id: '6',  name: 'Ananya Iyer',     phone: '+91 43210 98765', upiId: 'ananya@okhdfc',    online: true },
  { id: '7',  name: 'Karthik Nair',    phone: '+91 32109 87654', upiId: null,                online: false },
  { id: '8',  name: 'Divya Gupta',     phone: '+91 21098 76543', upiId: 'divya@oksbi',      online: false },
  { id: '9',  name: 'Arjun Kumar',     phone: '+91 10987 65432', upiId: 'arjun@okicici',    online: true },
  { id: '10', name: 'Meera Joshi',     phone: '+91 99887 76655', upiId: 'meera@ybl',        online: false },
  { id: '11', name: 'Rahul Verma',     phone: '+91 98876 65544', upiId: null,                online: false },
  { id: '12', name: 'Neha Kapoor',     phone: '+91 97765 54433', upiId: 'neha@okaxis',      online: true },
  { id: '13', name: 'Suresh Babu',     phone: '+91 96654 43322', upiId: 'suresh@oksbi',     online: false },
  { id: '14', name: 'Lakshmi Devi',    phone: '+91 95543 32211', upiId: null,                online: false },
  { id: '15', name: 'Aditya Rao',      phone: '+91 94432 21100', upiId: 'aditya@paytm',     online: true },
  { id: '16', name: 'Pooja Mishra',    phone: '+91 93321 10099', upiId: 'pooja@okhdfc',     online: false },
  { id: '17', name: 'Deepak Jain',     phone: '+91 92210 09988', upiId: null,                online: false },
  { id: '18', name: 'Kavitha Pillai',  phone: '+91 91109 98877', upiId: 'kavitha@ybl',      online: true },
  { id: '19', name: 'Manish Tiwari',   phone: '+91 90098 87766', upiId: 'manish@okicici',   online: false },
  { id: '20', name: 'Sanya Bhatia',    phone: '+91 89987 76655', upiId: null,                online: false },
  { id: '21', name: 'Ravi Prasad',     phone: '+91 88876 65544', upiId: 'ravi@oksbi',       online: true },
  { id: '22', name: 'Ishita Saxena',   phone: '+91 87765 54433', upiId: 'ishita@okaxis',    online: false },
  { id: '23', name: 'Naveen Choudhary',phone: '+91 86654 43322', upiId: null,                online: false },
  { id: '24', name: 'Tanvi Agarwal',   phone: '+91 85543 32211', upiId: 'tanvi@paytm',      online: true },
]

// How many contacts to show in collapsed state
const COLLAPSED_COUNT = 12

// Generate initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic pastel colour from name
const AVATAR_COLORS = [
  'bg-blue-500',   'bg-purple-500', 'bg-pink-500',
  'bg-emerald-500','bg-amber-500',  'bg-cyan-500',
  'bg-rose-500',   'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500',
]
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const PayContactsPage: React.FC = () => {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Filter contacts by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_CONTACTS
    const q = search.toLowerCase()
    return MOCK_CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.upiId && c.upiId.toLowerCase().includes(q)),
    )
  }, [search])

  // Slice for collapsed / expanded
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_COUNT)
  const hasMore = filtered.length > COLLAPSED_COUNT

  const handleContactTap = (contact: Contact) => {
    if (!contact.upiId) {
      // Inline toast-style feedback – keeps the flow simple
      import('react-hot-toast').then(({ default: toast }) =>
        toast('UPI not available for this contact', { icon: '⚠️' }),
      )
      return
    }
    navigate('/pay/contact', { state: { contact } })
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {/* ── Header ─────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">People</h1>
        </div>

        {/* Search bar */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, number or UPI ID"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
            />
          </div>
        </div>
      </div>

      {/* ── Contact Grid ───────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <User size={40} strokeWidth={1.5} />
            <p className="mt-3 text-sm">No contacts found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-6 gap-x-3">
              <AnimatePresence mode="popLayout">
                {visible.map((contact) => (
                  <motion.button
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleContactTap(contact)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div
                        className={`w-14 h-14 rounded-full ${avatarColor(contact.name)} flex items-center justify-center text-white font-semibold text-base shadow-sm group-hover:shadow-md group-active:scale-95 transition-all`}
                      >
                        {getInitials(contact.name)}
                      </div>
                      {/* Online indicator */}
                      {contact.online && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    {/* Name */}
                    <span className="text-xs text-gray-600 font-medium leading-tight text-center line-clamp-2 max-w-[80px]">
                      {contact.name}
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* More / Less toggle */}
            {hasMore && (
              <motion.button
                layout
                onClick={() => setExpanded((v) => !v)}
                className="mx-auto mt-6 flex items-center gap-1.5 px-5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} /> Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> More ({filtered.length - COLLAPSED_COUNT})
                  </>
                )}
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
