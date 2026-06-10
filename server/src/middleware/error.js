export function errorHandler(err, req, res, next) {
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: '记录不存在' });
  }
  console.error(err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
}
