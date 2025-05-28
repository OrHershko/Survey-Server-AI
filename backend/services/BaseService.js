const logger = require('../config/logger');

/**
 * Base class for services that interact with Mongoose models.
 * Provides common CRUD operations with standardized error handling and logging.
 */
class BaseService {
  constructor(model) {
    if (!model) {
      throw new Error('Mongoose model must be provided to BaseService constructor.');
    }
    this.model = model;
    this.modelName = model.modelName || 'Model'; // Get model name for logging
  }

  /**
   * Creates a new document.
   * @param {object} data - The data for the new document.
   * @returns {Promise<object>} The created document.
   */
  async create(data) {
    try {
      logger.info(`Creating new ${this.modelName} with data:`, data);
      const newDocument = await this.model.create(data);
      logger.info(`${this.modelName} created successfully with id: ${newDocument._id}`);
      return newDocument;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}: ${error.message}`, { stack: error.stack, data });
      // You might want to throw a custom error or a more specific error type here
      throw error; 
    }
  }

  /**
   * Finds a document by its ID.
   * @param {string} id - The ID of the document to find.
   * @param {string} [select] - Optional fields to select (Mongoose select string).
   * @param {object} [populateOptions] - Optional Mongoose populate options.
   * @returns {Promise<object|null>} The found document or null if not found.
   */
  async findById(id, select = '', populateOptions = null) {
    try {
      logger.debug(`Finding ${this.modelName} by id: ${id}`);
      let query = this.model.findById(id);
      if (select) {
        query = query.select(select);
      }
      if (populateOptions) {
        query = query.populate(populateOptions);
      }
      const document = await query.exec();
      if (!document) {
        logger.warn(`${this.modelName} with id: ${id} not found.`);
        return null;
      }
      logger.debug(`${this.modelName} with id: ${id} found.`);
      return document;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by id ${id}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Finds multiple documents based on a query.
   * @param {object} query - The Mongoose query object.
   * @param {object} [options] - Options like limit, skip, sort.
   * @param {string} [select] - Optional fields to select.
   * @param {object} [populateOptions] - Optional Mongoose populate options.
   * @returns {Promise<Array<object>>} An array of found documents.
   */
  async find(query = {}, options = {}, select = '', populateOptions = null) {
    try {
      logger.debug(`Finding ${this.modelName}s with query:`, query);
      let dbQuery = this.model.find(query);
      if (options.limit) {
        dbQuery = dbQuery.limit(parseInt(options.limit, 10));
      }
      if (options.skip) {
        dbQuery = dbQuery.skip(parseInt(options.skip, 10));
      }
      if (options.sort) {
        dbQuery = dbQuery.sort(options.sort);
      }
      if (select) {
        dbQuery = dbQuery.select(select);
      }
      if (populateOptions) {
        dbQuery = dbQuery.populate(populateOptions);
      }
      const documents = await dbQuery.exec();
      logger.debug(`Found ${documents.length} ${this.modelName}(s).`);
      return documents;
    } catch (error) {
      logger.error(`Error finding ${this.modelName}s: ${error.message}`, { stack: error.stack, query });
      throw error;
    }
  }

  /**
   * Updates a document by its ID.
   * @param {string} id - The ID of the document to update.
   * @param {object} updateData - The data to update the document with.
   * @param {object} [options] - Mongoose query options (e.g., { new: true, runValidators: true }).
   * @returns {Promise<object|null>} The updated document or null if not found.
   */
  async updateById(id, updateData, options = { new: true, runValidators: true }) {
    try {
      logger.info(`Updating ${this.modelName} with id: ${id} with data:`, updateData);
      const updatedDocument = await this.model.findByIdAndUpdate(id, updateData, options);
      if (!updatedDocument) {
        logger.warn(`${this.modelName} with id: ${id} not found for update.`);
        return null;
      }
      logger.info(`${this.modelName} with id: ${id} updated successfully.`);
      return updatedDocument;
    } catch (error) {
      logger.error(`Error updating ${this.modelName} with id ${id}: ${error.message}`, { stack: error.stack, updateData });
      throw error;
    }
  }

  /**
   * Deletes a document by its ID.
   * @param {string} id - The ID of the document to delete.
   * @returns {Promise<object|null>} The deleted document or null if not found.
   */
  async deleteById(id) {
    try {
      logger.info(`Deleting ${this.modelName} with id: ${id}`);
      const deletedDocument = await this.model.findByIdAndDelete(id);
      if (!deletedDocument) {
        logger.warn(`${this.modelName} with id: ${id} not found for deletion.`);
        return null;
      }
      logger.info(`${this.modelName} with id: ${id} deleted successfully.`);
      return deletedDocument;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName} with id ${id}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
  
  /**
   * Counts documents matching a query.
   * @param {object} query - The Mongoose query object.
   * @returns {Promise<number>} The count of matching documents.
   */
  async count(query = {}) {
    try {
      logger.debug(`Counting ${this.modelName}s with query:`, query);
      const count = await this.model.countDocuments(query);
      logger.debug(`Found ${count} ${this.modelName}(s) matching query.`);
      return count;
    } catch (error) {
      logger.error(`Error counting ${this.modelName}s: ${error.message}`, { stack: error.stack, query });
      throw error;
    }
  }
}

module.exports = BaseService; 