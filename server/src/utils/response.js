export function success(res, data = null, message = '操作成功') {
  return res.json({ success: true, message, data });
}

export function paginate(res, data, total, page, pageSize) {
  return res.json({
    success: true,
    data: {
      list: data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export function fail(res, message = '操作失败', status = 400) {
  return res.status(status).json({ success: false, message });
}
