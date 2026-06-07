import request from '../utils/request'

export const getPlans = () => request.get('/plans')
export const createPlan = (data) => request.post('/plans', data)
export const updatePlan = (id, data) => request.put(`/plans/${id}`, data)
export const deletePlan = (id) => request.delete(`/plans/${id}`)
export const getPlanCourses = (id) => request.get(`/plans/${id}/courses`)
export const addPlanCourse = (id, data) => request.post(`/plans/${id}/courses`, data)
export const updatePlanCourse = (id, data) => request.put(`/plans/courses/${id}`, data)
export const deletePlanCourse = (id) => request.delete(`/plans/courses/${id}`)
export const addPlanTextbook = (courseId, data) => request.post(`/plans/courses/${courseId}/textbooks`, data)
export const deletePlanTextbook = (id) => request.delete(`/plans/textbooks/${id}`)
