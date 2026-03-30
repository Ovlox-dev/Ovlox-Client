import React from 'react';
import {
  type FieldErrors,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormRegister,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';
interface BaseProps<T extends FieldValues> {
  label?: string;
  hint?: string;
  className?: string;
  name: Path<T>;
  register?: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  required?: boolean;
  rules?: RegisterOptions<T, Path<T>>;
}

export function InputField<T extends FieldValues>({
  label,
  hint,
  className,
  name,
  register,
  errors,
  required,
  rules,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & BaseProps<T>) {
  return (
    <div className={cn('space-y-2')}>
      {label && (
        <Label htmlFor={name} className=''>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </Label>
      )}
      <Input id={name} {...register?.(name, rules)} {...props} className={cn(className)} />
      {hint && <p className='text-sm text-gray-400 mt-1'>{hint}</p>}
      {errors?.[name] && <p className='text-red-500 text-sm mt-1'>{errors[name]?.message as string}</p>}
    </div>
  );
}

