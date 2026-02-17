"use client"

import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { fetchUsers, banUser, unbanUser } from "../store/slices/adminSlice"
import AdminSidebar from "../components/AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"

export default function AdminUsers() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { users, loading } = useSelector((state) => state.admin)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [banReason, setBanReason] = useState("")
  const [showBanModal, setShowBanModal] = useState(false)

  useEffect(() => {
    dispatch(fetchUsers({ page, search }))
  }, [dispatch, page, search])

  const handleBanClick = (user) => {
    setSelectedUser(user)
    setShowBanModal(true)
  }

  const confirmBan = async () => {
    if (selectedUser && banReason) {
      await dispatch(banUser({ userId: selectedUser.id, reason: banReason }))
      setShowBanModal(false)
      setBanReason("")
      dispatch(fetchUsers({ page, search }))
    }
  }

  const handleUnban = async (userId) => {
    await dispatch(unbanUser(userId))
    dispatch(fetchUsers({ page, search }))
  }

  if (loading) return <div className="p-8 text-center">Loading users...</div>

  const { users: userList = [], pagination = {} } = users || {}

  return (
    <div className="flex h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-8">User Management</h1>

          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Search users by email or username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="bg-slate-900 border-cyan-500 text-white"
            />
          </div>

          {/* Users Table */}
          <Card className="bg-slate-900 border-cyan-500">
            <CardHeader>
              <CardTitle className="text-white">All Users ({pagination.total})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-cyan-400">Email</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Username</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Status</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Joined</th>
                      <th className="text-left py-3 px-4 text-cyan-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((user) => (
                      <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800">
                        <td className="py-3 px-4 text-white">{user.email}</td>
                        <td className="py-3 px-4 text-slate-400">{user.username}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              user.status === "active"
                                ? "bg-emerald-900 text-emerald-300"
                                : user.status === "suspended"
                                  ? "bg-orange-900 text-orange-300"
                                  : "bg-red-900 text-red-300"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 flex gap-2">
                          <Button
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 text-sm"
                          >
                            View
                          </Button>
                          {user.status === "active" ? (
                            <Button
                              onClick={() => handleBanClick(user)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                            >
                              Ban
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleUnban(user.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-sm"
                            >
                              Unban
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6">
                <p className="text-slate-400">
                  Page {pagination.currentPage} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                    disabled={page === pagination.pages}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ban Modal */}
          {showBanModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-slate-900 border-red-500 w-96">
                <CardHeader>
                  <CardTitle className="text-red-400">Ban User</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white mb-4">Ban {selectedUser?.email}?</p>
                  <textarea
                    placeholder="Reason for ban..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full bg-slate-800 border border-cyan-500 text-white p-2 rounded mb-4"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button onClick={confirmBan} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                      Confirm Ban
                    </Button>
                    <Button
                      onClick={() => {
                        setShowBanModal(false)
                        setBanReason("")
                      }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
