import request from '../utils/request'

export const getSemesterQuery = (params) => request.get('/query/semester', { params })
export const getTextbookQuery = (id) => request.get(`/query/textbook/${id}`)
export const getTextbooksOverview = () => request.get('/query/textbooks')
