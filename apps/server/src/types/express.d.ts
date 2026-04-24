declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'manager' | 'member';
      tenantId: string;
    };
    validatedData?: any;
  }
}
