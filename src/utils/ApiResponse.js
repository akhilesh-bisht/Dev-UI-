class ApiResponse {
  constructor(statusCode, message = "success", data, success) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
}
export { ApiResponse };
