-- Migration 3: Data locking trigger (prevents editing is_final=TRUE rows)
CREATE OR REPLACE FUNCTION public.enforce_data_lock_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'Akses Ditolak: Data NIP % telah dikunci permanen.', OLD.nip_pegawai;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_final = TRUE THEN
    RAISE EXCEPTION 'Akses Ditolak: Data NIP % telah dikunci permanen.', OLD.nip_pegawai;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.is_final = TRUE AND OLD.is_final = FALSE THEN
    NEW.verified_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_verified_pegawai ON public.pegawai_coretax;
CREATE TRIGGER trg_lock_verified_pegawai
BEFORE UPDATE OR DELETE ON public.pegawai_coretax
FOR EACH ROW EXECUTE FUNCTION public.enforce_data_lock_integrity();
