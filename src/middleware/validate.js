export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.validated = parsed.data;
    next();
  };
}
