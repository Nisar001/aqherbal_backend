
export const successResponse = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, data, message });
};

export const errorResponse = (res, message = 'Error', status = 500, errors = []) => {
  return res.status(status).json({ success: false, message, errors });
};

export const paginatedResponse = (res, data, page, limit, total, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    data,
    page,
    limit,
    total,
    message
  });
};

export const responseHelper = {
  success: successResponse,
  error: errorResponse,
  paginated: paginatedResponse,
  validationError: (res, message = 'Validation Error', status = 400, errors = []) => {
    return res.status(status).json({ success: false, message, errors });
  },
  conflict: (res, message = 'Conflict', status = 409, errors = []) => {
    return res.status(status).json({ success: false, message, errors });
  },
  created: (res, data, message = 'Created', status = 201) => {
    return res.status(status).json({ success: true, data, message });
  },
  unauthorized: (res, message = 'Unauthorized', status = 401, errors = []) => {
    return res.status(status).json({ success: false, message, errors });
  },
  forbidden: (res, message = 'Forbidden', status = 403, errors = []) => {
    return res.status(status).json({ success: false, message, errors });
  },
  notFound: (res, message = 'Not Found', status = 404) => {
    return res.status(status).json({ success: false, message });
  }
};

// Generic response function with flexible parameters
export const response = (res, status = 200, message = 'Success', data = null, errors = null) => {
  const payload = { success: status >= 200 && status < 300, message };
  if (data !== null) payload.data = data;
  if (errors !== null) payload.errors = errors;
  return res.status(status).json(payload);
};
