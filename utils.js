function createError(error) {
  return { 
    status: 'error', 
    error: error && error.message ? error.message : String(error) 
  }
}


function createSuccess(data) {
  return { status: 'success', data }
}

function createResult(error, data) {
  if (error) {
    return createError(error)
  } else {
    return createSuccess(data)
  }
}

module.exports = {
  createError,
  createSuccess,
  createResult,
}
