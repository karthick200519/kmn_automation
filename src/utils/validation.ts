import { z } from 'zod';
import { SECURITY_CONFIG } from '../config/security.config';

// Strict UUID regex
const uuidSchema = z.string().uuid({ message: 'Invalid unique identifier format.' });

// 1. Auth Schemas
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email is required.' })
    .email({ message: 'Invalid email address format.' })
    .max(SECURITY_CONFIG.MAX_EMAIL_LENGTH, { message: 'Email address is too long.' }),
  password: z
    .string()
    .min(1, { message: 'Password is required.' })
    .min(SECURITY_CONFIG.MIN_PASSWORD_LENGTH, { message: `Password must be at least ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters.` })
    .max(SECURITY_CONFIG.MAX_STRING_LENGTH, { message: 'Password exceeds maximum permitted length.' }),
}).strict();

// 2. Motor Metadata Schema
export const motorMetadataSchema = z.object({
  motor_id: uuidSchema,
  motor_name: z
    .string()
    .trim()
    .min(2, { message: 'Motor name must be at least 2 characters.' })
    .max(100, { message: 'Motor name cannot exceed 100 characters.' }),
  rated_voltage: z
    .number()
    .min(100, { message: 'Rated voltage must be at least 100V.' })
    .max(1000, { message: 'Rated voltage cannot exceed 1000V.' }),
  rated_current: z
    .number()
    .min(0.1, { message: 'Rated current must be greater than 0.' })
    .max(500, { message: 'Rated current cannot exceed 500A.' }),
}).strict();

// 3. Maintenance Schedule Schema
export const scheduleSchema = z
  .object({
    id: uuidSchema.optional(),
    motor_id: uuidSchema,
    title: z
      .string()
      .trim()
      .min(3, { message: 'Title must be at least 3 characters.' })
      .max(SECURITY_CONFIG.MAX_STRING_LENGTH, { message: 'Title is too long.' }),
    schedule_type: z.enum([
      'inspection',
      'preventive_maintenance',
      'bearing_inspection',
      'lubrication',
      'electrical_inspection',
      'vibration_inspection',
      'general_maintenance',
    ]),
    description: z.string().trim().max(SECURITY_CONFIG.MAX_TEXT_AREA_LENGTH).optional().nullable(),
    assigned_to: uuidSchema.optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    start_time: z.string().datetime({ message: 'Invalid start time timestamp format.' }),
    end_time: z.string().datetime({ message: 'Invalid end time timestamp format.' }).optional().nullable(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue']),
    notes: z.string().trim().max(SECURITY_CONFIG.MAX_TEXT_AREA_LENGTH).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return new Date(data.end_time).getTime() >= new Date(data.start_time).getTime();
      }
      return true;
    },
    { message: 'End time must be after or equal to start time.', path: ['end_time'] }
  );

// 4. Hardware Control Schema
export const controlCommandSchema = z.object({
  motor_id: uuidSchema.optional().nullable(),
  relay_1: z.boolean().optional().nullable(),
  relay_2: z.boolean().optional().nullable(),
  relay_3: z.boolean().optional().nullable(),
  buzzer: z.boolean().optional().nullable(),
  emergency: z.boolean(),
}).strict();

// 5. Emergency Command Schema
export const emergencyCommandSchema = z.object({
  motor_id: uuidSchema.optional().nullable(),
  emergency: z.literal(true, { errorMap: () => ({ message: 'Emergency flag must be set to true.' }) }),
  confirmation: z.literal(true, { errorMap: () => ({ message: 'Explicit safety confirmation is required.' }) }),
}).strict();

// 6. User Management Schema (Admin only)
export const userManagementSchema = z.object({
  user_id: uuidSchema,
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(100, { message: 'Name cannot exceed 100 characters.' }),
  role: z.enum(['admin', 'engineer', 'operator']),
  status: z.enum(['active', 'inactive']),
}).strict();

// 7. System Settings Schema
export const systemSettingSchema = z.object({
  setting_key: z.string().min(1).max(50),
  setting_value: z.object({
    mode: z.enum(['demo', 'live']).optional(),
  }).passthrough(),
}).strict();

// 8. Report Filter Schema
export const reportFilterSchema = z.object({
  motor_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  severity: z.string().optional(),
  fault_class: z.string().optional(),
  data_source: z.enum(['all', 'demo', 'live']).optional(),
}).strict();
