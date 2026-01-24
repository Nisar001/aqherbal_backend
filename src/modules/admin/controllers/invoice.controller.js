// Invoice management controller functions - to be appended to admin/controllers/index.js

import { InvoiceService } from '../../../services/invoice.service.js';
import { successResponse } from '../../../helpers/response.helper.js';
import { AppError } from '../../../middlewares/error.middleware.js';

// Invoice Management
export const generateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { terms, notes, gstin, invoiceDate, dueDate } = req.body;

    const invoice = await InvoiceService.generateInvoice(
      orderId,
      req.user.id,
      { terms, notes, gstin, invoiceDate, dueDate }
    );

    return successResponse(res, invoice, 'Invoice generated successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getOrderInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const invoice = await InvoiceService.getOrderInvoice(orderId);
    return successResponse(res, invoice, 'Invoice retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await InvoiceService.getInvoiceById(id);
    return successResponse(res, invoice, 'Invoice retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const listInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filters = { status: status || undefined };
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const result = await InvoiceService.listInvoices(filters, parseInt(page), parseInt(limit));
    return successResponse(res, result, 'Invoices retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const invoice = await InvoiceService.updateInvoiceStatus(id, status);
    return successResponse(res, invoice, 'Invoice status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const recordInvoicePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      throw new AppError('Invalid payment amount', 400);
    }

    const invoice = await InvoiceService.recordPayment(id, amountPaid);
    return successResponse(res, invoice, 'Payment recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await InvoiceService.cancelInvoice(id, reason);
    return successResponse(res, invoice, 'Invoice cancelled successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    await InvoiceService.deleteInvoice(id);
    return successResponse(res, { message: 'Invoice deleted successfully' }, 'Success');
  } catch (error) {
    next(error);
  }
};

export const downloadInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pdfData = await InvoiceService.generateInvoicePDF(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfData.filename}"`);
    res.send(pdfData.html);
  } catch (error) {
    next(error);
  }
};

export const viewInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pdfData = await InvoiceService.generateInvoicePDF(id);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(pdfData.html);
  } catch (error) {
    next(error);
  }
};
