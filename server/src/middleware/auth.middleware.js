import { AuthService } from '../services/auth.service.js'

export function authMiddleware(req, res, next) {
  let token = null

  // 优先从 Authorization 头获取
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }
  // 备选：从查询参数获取短期下载令牌（用于 window.open 等场景）
  else if (req.query.downloadToken) {
    const decoded = AuthService.verifyDownloadToken(req.query.downloadToken)
    if (decoded) {
      req.user = decoded
      return next()
    }
    return res.status(401).json({
      success: false,
      message: '下载令牌无效或已过期'
    })
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录'
    })
  }

  const decoded = AuthService.verifyToken(token)

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Token无效或已过期'
    })
  }

  req.user = decoded
  next()
}

export function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`用户 ${req.user.username} (${req.user.role}) 尝试访问受限资源`)

      return res.status(403).json({
        success: false,
        message: '权限不足，无法执行此操作'
      })
    }

    next()
  }
}
