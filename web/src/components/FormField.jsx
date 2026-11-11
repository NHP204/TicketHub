import Field from './ui/Field.jsx';
import Input from './ui/Input.jsx';

export default function FormField({ id, label, hint, error, ...inputProps }) {
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <Input name={id} {...inputProps} />
    </Field>
  );
}
