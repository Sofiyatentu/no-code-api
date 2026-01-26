"use client"

import { useEffect, useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import {
  fetchProjects,
  createProject,
  deleteProject,
} from "../store/slices/projectsSlice.js"
import { logout } from "../store/slices/authSlice.js"
import {
  X,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react"

export default function Dashboard() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { projects, loading } = useSelector((state) => state.projects)

  // UI States
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // "", "active", "draft", "archived"

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showMongoUri, setShowMongoUri] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ name: "", mongoUri: "", description: "" })
  const [errors, setErrors] = useState({})

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState(null)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    dispatch(fetchProjects())
  }, [dispatch])

  // SEARCH + FILTER
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.slug?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = !statusFilter || project.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [projects, searchQuery, statusFilter])

  // CREATE PROJECT
  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = "Project name is required"
    if (!formData.mongoUri.trim()) newErrors.mongoUri = "MongoDB URI is required"
    else if (!/^mongodb(\+srv)?:\/\//i.test(formData.mongoUri.trim()))
      newErrors.mongoUri = "Invalid MongoDB URI"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm() || isCreating) return
    setIsCreating(true)
    try {
      await dispatch(createProject({
        name: formData.name.trim(),
        mongoUri: formData.mongoUri.trim(),
        description: formData.description.trim() || undefined
      })).unwrap()
      setIsCreateOpen(false)
      setFormData({ name: "", mongoUri: "", description: "" })
      setShowMongoUri(false)
      setErrors({})
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  // DELETE PROJECT
  const openDeleteModal = (project) => {
    setDeleteModal({ id: project._id, name: project.name })
    setConfirmText("")
  }

  const closeDeleteModal = () => {
    setDeleteModal(null)
    setConfirmText("")
  }

  const handleDelete = async () => {
    if (confirmText !== "DELETE" || isDeleting) return
    setIsDeleting(true)
    try {
      await dispatch(deleteProject(deleteModal.id)).unwrap()
      closeDeleteModal()
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyUri = () => navigator.clipboard.writeText(formData.mongoUri)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-8 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-emerald-400">Dashboard</h1>
        <div className="flex items-center gap-6">
          <span className="text-slate-400">{user?.email}</span>
          <button
            onClick={() => dispatch(logout())}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Header + Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <h2 className="text-3xl font-bold">Your Projects ({filteredProjects.length})</h2>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 transition w-full sm:w-80"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Create Button */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold transition shadow-lg"
            >
              <Plus size={22} />
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex justify-center py-32">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div class="text-center py-24">
            <div class="bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl w-40 h-40 mx-auto mb-8 flex items-center justify-center">
              {searchQuery || statusFilter ? (
                <Search size={64} class="text-slate-600" />
              ) : (
                <Plus size={64} class="text-slate-600" />
              )}
            </div>
            <p class="text-slate-400 text-xl">
              {searchQuery || statusFilter
                ? "No projects found matching your search."
                : "No projects yet. Create your first one!"}
            </p>
          </div>
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                class="group relative p-7 rounded-2xl border border-slate-800 bg-slate-900 hover:border-emerald-600 hover:shadow-2xl hover:shadow-emerald-900/30 transition-all duration-300"
              >
                {/* Delete Button */}
                <button
                  onClick={() => openDeleteModal(project)}
                  class="absolute top-4 right-4 p-2.5 rounded-lg bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 transition-all backdrop-blur-sm"
                  title="Delete project"
                >
                  <Trash2 size={18} />
                </button>

                <h3 class="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition pr-10">
                  {project.name}
                </h3>

                <p class="text-slate-400 text-sm mb-4 line-clamp-2 min-h-10">
                  {project.description || "No description"}
                </p>

                <div class="flex items-center gap-3 mb-6">
                  <span
                    class={`px-3 py-1 rounded-full text-xs font-medium ${project.status === "active"
                      ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                      : project.status === "draft"
                        ? "bg-slate-800 text-slate-400"
                        : "bg-orange-900/50 text-orange-300 border border-orange-700"
                      }`}
                  >
                    {project.status || "draft"}
                  </span>
                  <span class="text-xs text-slate-500">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div class="flex gap-3">
                  <Link
                    to={`/project/${project._id}/builder`}
                    class="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-center font-semibold transition"
                  >
                    Builder
                  </Link>
                  <Link
                    to={`/project/${project._id}/playground`}
                    class="flex-1 py-3 rounded-lg border border-emerald-600 text-emerald-400 hover:bg-emerald-950 text-center font-semibold transition"
                  >
                    Test
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <>
          <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setIsCreateOpen(false)} />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-screen overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex justify-between items-center p-8 border-b border-slate-700">
                <h2 class="text-3xl font-bold text-emerald-400">Create New Project</h2>
                <button onClick={() => setIsCreateOpen(false)} class="p-3 hover:bg-slate-800 rounded-xl">
                  <X size={24} />
                </button>
              </div>

              <div class="p-8 space-y-6">
                {/* Name */}
                <div>
                  <label class="block text-sm font-semibold text-slate-300 mb-2">
                    Project Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Awesome API"
                    class={`w-full px-5 py-4 rounded-xl bg-slate-800 border ${errors.name ? "border-red-500" : "border-slate-600"
                      } focus:border-emerald-500 focus:outline-none text-lg`}
                    autoFocus
                  />
                  {errors.name && <p class="text-red-400 text-sm mt-2">{errors.name}</p>}
                </div>

                {/* MongoDB URI */}
                <div>
                  <label class="block text-sm font-semibold text-slate-300 mb-2">
                    MongoDB URI <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      type={showMongoUri ? "text" : "password"}
                      value={formData.mongoUri}
                      onChange={(e) => setFormData({ ...formData, mongoUri: e.target.value })}
                      placeholder="mongodb+srv://..."
                      class={`w-full px-5 py-4 pr-32 rounded-xl bg-slate-800 border font-mono text-sm ${errors.mongoUri ? "border-red-500" : "border-slate-600"
                        } focus:border-emerald-500 focus:outline-none`}
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                      {formData.mongoUri && (
                        <button type="button" onClick={copyUri} class="p-2 hover:bg-slate-700 rounded">
                          <Copy size={18} class="text-slate-400" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowMongoUri(!showMongoUri)}
                        class="p-2 hover:bg-slate-700 rounded"
                      >
                        {showMongoUri ? <EyeOff size={18} /> : <Eye size={18} class="text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  {errors.mongoUri && <p class="text-red-400 text-sm mt-2">{errors.mongoUri}</p>}
                </div>

                {/* Description */}
                <div>
                  <label class="block text-sm font-semibold text-slate-300 mb-2">Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    class="w-full px-5 py-4 rounded-xl bg-slate-800 border border-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-4 p-8 border-t border-slate-700">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  class="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!formData.name || !formData.mongoUri || isCreating}
                  class="px-10 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-semibold flex items-center gap-3"
                >
                  {isCreating ? (
                    <>
                      <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={20} /> Create Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteModal && (
        <>
          <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={closeDeleteModal} />
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              class="bg-slate-900 border border-red-900/50 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="p-8">
                <div class="flex items-center gap-4 text-red-400 mb-6">
                  <AlertCircle size={32} />
                  <h2 class="text-2xl font-bold">Delete Project</h2>
                </div>

                <p class="text-slate-300 mb-4">
                  This action <strong>cannot be undone</strong>. This will permanently delete:
                </p>
                <ul class="text-slate-400 text-sm space-y-2 mb-6">
                  <li>• Project "<strong>{deleteModal.name}</strong>"</li>
                  <li>• All endpoints and mocks</li>
                  <li>• Request logs and analytics</li>
                </ul>

                <p class="text-slate-300">
                  Type <span class="font-bold text-red-400">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  class="w-full mt-3 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:border-red-500 focus:outline-none font-mono text-lg"
                  autoFocus
                />

                <div class="flex justify-end gap-4 mt-8">
                  <button
                    onClick={closeDeleteModal}
                    class="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmText !== "DELETE" || isDeleting}
                    class="px-8 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed font-bold flex items-center gap-2"
                  >
                    {isDeleting ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}