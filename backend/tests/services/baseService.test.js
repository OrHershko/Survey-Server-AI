const BaseService = require('../../services/BaseService');
const logger = require('../../config/logger');

// Mock logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock Mongoose Model with query chaining
const createMockQuery = (returnValue) => ({
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(returnValue)
});

const mockModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
  modelName: 'Model'
};

describe('BaseService', () => {
  let baseService;

  beforeEach(() => {
    baseService = new BaseService(mockModel);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with a model', () => {
      expect(baseService.model).toBe(mockModel);
    });

    it('should throw error if no model provided', () => {
      expect(() => new BaseService()).toThrow('Mongoose model must be provided to BaseService constructor.');
    });
  });

  describe('find', () => {
    it('should find documents with query', async () => {
      const mockResults = [{ _id: '1', name: 'test' }];
      const mockQuery = createMockQuery(mockResults);
      mockModel.find.mockReturnValue(mockQuery);

      const result = await baseService.find({ name: 'test' });

      expect(mockModel.find).toHaveBeenCalledWith({ name: 'test' });
      expect(result).toBe(mockResults);
    });

    it('should find all documents when no query provided', async () => {
      const mockResults = [{ _id: '1' }, { _id: '2' }];
      const mockQuery = createMockQuery(mockResults);
      mockModel.find.mockReturnValue(mockQuery);

      const result = await baseService.find();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(result).toBe(mockResults);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      const mockQuery = createMockQuery();
      mockQuery.exec.mockRejectedValue(error);
      mockModel.find.mockReturnValue(mockQuery);

      await expect(baseService.find({ name: 'test' })).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const mockDoc = { _id: '507f1f77bcf86cd799439011', name: 'test' };
      const mockQuery = createMockQuery(mockDoc);
      mockModel.findById.mockReturnValue(mockQuery);

      const result = await baseService.findById('507f1f77bcf86cd799439011');

      expect(mockModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockDoc);
    });

    it('should return null for non-existent id', async () => {
      const mockQuery = createMockQuery(null);
      mockModel.findById.mockReturnValue(mockQuery);

      const result = await baseService.findById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should handle invalid ObjectId', async () => {
      const error = new Error('Cast to ObjectId failed');
      const mockQuery = createMockQuery();
      mockQuery.exec.mockRejectedValue(error);
      mockModel.findById.mockReturnValue(mockQuery);

      await expect(baseService.findById('invalid-id')).rejects.toThrow('Cast to ObjectId failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find one document with query', async () => {
      const mockDoc = { _id: '1', email: 'test@example.com' };
      const mockQuery = createMockQuery(mockDoc);
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await baseService.findOne({ email: 'test@example.com' });

      expect(mockModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toBe(mockDoc);
    });

    it('should return null when no match found', async () => {
      const mockQuery = createMockQuery(null);
      mockModel.findOne.mockReturnValue(mockQuery);

      const result = await baseService.findOne({ email: 'nonexistent@example.com' });

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      const mockQuery = createMockQuery();
      mockQuery.exec.mockRejectedValue(error);
      mockModel.findOne.mockReturnValue(mockQuery);

      await expect(baseService.findOne({ email: 'test@example.com' })).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new document', async () => {
      const inputData = { name: 'New Item', email: 'new@example.com' };
      const mockCreatedDoc = { _id: '507f1f77bcf86cd799439011', ...inputData };
      mockModel.create.mockResolvedValue(mockCreatedDoc);

      const result = await baseService.create(inputData);

      expect(mockModel.create).toHaveBeenCalledWith(inputData);
      expect(result).toBe(mockCreatedDoc);
    });

    it('should handle validation errors', async () => {
      const inputData = { name: '' }; // Invalid data
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      mockModel.create.mockRejectedValue(error);

      await expect(baseService.create(inputData)).rejects.toThrow('Validation failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle duplicate key errors', async () => {
      const inputData = { email: 'existing@example.com' };
      const error = new Error('Duplicate key error');
      error.code = 11000;
      mockModel.create.mockRejectedValue(error);

      await expect(baseService.create(inputData)).rejects.toThrow('Duplicate key error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update document by id', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUpdatedDoc = { _id: '507f1f77bcf86cd799439011', name: 'Updated Name' };
      mockModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedDoc);

      const result = await baseService.update('507f1f77bcf86cd799439011', updateData);

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateData,
        { new: true, runValidators: true }
      );
      expect(result).toBe(mockUpdatedDoc);
    });

    it('should return null for non-existent document', async () => {
      mockModel.findByIdAndUpdate.mockResolvedValue(null);

      const result = await baseService.update('507f1f77bcf86cd799439011', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should handle validation errors on update', async () => {
      const error = new Error('Validation error');
      error.name = 'ValidationError';
      mockModel.findByIdAndUpdate.mockRejectedValue(error);

      await expect(baseService.update('507f1f77bcf86cd799439011', { name: '' })).rejects.toThrow('Validation error');
      expect(logger.error).toHaveBeenCalledWith('Error in BaseService.update:', error);
    });

    it('should handle invalid ObjectId on update', async () => {
      const error = new Error('Cast to ObjectId failed');
      mockModel.findByIdAndUpdate.mockRejectedValue(error);

      await expect(baseService.update('invalid-id', { name: 'test' })).rejects.toThrow('Cast to ObjectId failed');
      expect(logger.error).toHaveBeenCalledWith('Error in BaseService.update:', error);
    });
  });

  describe('delete', () => {
    it('should delete document by id', async () => {
      const mockDeletedDoc = { _id: '507f1f77bcf86cd799439011', name: 'Deleted Item' };
      mockModel.findByIdAndDelete.mockResolvedValue(mockDeletedDoc);

      const result = await baseService.delete('507f1f77bcf86cd799439011');

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBe(mockDeletedDoc);
    });

    it('should return null for non-existent document', async () => {
      mockModel.findByIdAndDelete.mockResolvedValue(null);

      const result = await baseService.delete('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      mockModel.findByIdAndDelete.mockRejectedValue(error);

      await expect(baseService.delete('507f1f77bcf86cd799439011')).rejects.toThrow('Deletion failed');
      expect(logger.error).toHaveBeenCalledWith('Error in BaseService.delete:', error);
    });

    it('should handle invalid ObjectId on delete', async () => {
      const error = new Error('Cast to ObjectId failed');
      mockModel.findByIdAndDelete.mockRejectedValue(error);

      await expect(baseService.delete('invalid-id')).rejects.toThrow('Cast to ObjectId failed');
      expect(logger.error).toHaveBeenCalledWith('Error in BaseService.delete:', error);
    });
  });

  describe('count', () => {
    it('should count documents with query', async () => {
      mockModel.countDocuments.mockResolvedValue(5);

      const result = await baseService.count({ status: 'active' });

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ status: 'active' });
      expect(result).toBe(5);
    });

    it('should count all documents when no query provided', async () => {
      mockModel.countDocuments.mockResolvedValue(10);

      const result = await baseService.count();

      expect(mockModel.countDocuments).toHaveBeenCalledWith({});
      expect(result).toBe(10);
    });

    it('should handle count errors', async () => {
      const error = new Error('Count operation failed');
      mockModel.countDocuments.mockRejectedValue(error);

      await expect(baseService.count({ status: 'active' })).rejects.toThrow('Count operation failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple documents with query', async () => {
      const mockResult = { deletedCount: 3 };
      mockModel.deleteMany.mockResolvedValue(mockResult);

      const result = await baseService.deleteMany({ status: 'inactive' });

      expect(mockModel.deleteMany).toHaveBeenCalledWith({ status: 'inactive' });
      expect(result).toBe(mockResult);
    });

    it('should handle deleteMany with empty query', async () => {
      const mockResult = { deletedCount: 0 };
      mockModel.deleteMany.mockResolvedValue(mockResult);

      const result = await baseService.deleteMany({});

      expect(mockModel.deleteMany).toHaveBeenCalledWith({});
      expect(result).toBe(mockResult);
    });

    it('should handle deleteMany errors', async () => {
      const error = new Error('Bulk delete failed');
      mockModel.deleteMany.mockRejectedValue(error);

      await expect(baseService.deleteMany({ status: 'test' })).rejects.toThrow('Bulk delete failed');
      expect(logger.error).toHaveBeenCalledWith('Error in BaseService.deleteMany:', error);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle undefined query in find', async () => {
      const mockResults = [];
      const mockQuery = createMockQuery(mockResults);
      mockModel.find.mockReturnValue(mockQuery);

      const result = await baseService.find(undefined);

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(result).toBe(mockResults);
    });

    it('should handle null data in create', async () => {
      const error = new Error('Cannot create with null data');
      mockModel.create.mockRejectedValue(error);

      await expect(baseService.create(null)).rejects.toThrow('Cannot create with null data');
    });

    it('should handle empty update data', async () => {
      const mockUpdatedDoc = { _id: '507f1f77bcf86cd799439011', name: 'Original' };
      mockModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedDoc);

      const result = await baseService.update('507f1f77bcf86cd799439011', {});

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {},
        { new: true, runValidators: true }
      );
      expect(result).toBe(mockUpdatedDoc);
    });
  });
}); 