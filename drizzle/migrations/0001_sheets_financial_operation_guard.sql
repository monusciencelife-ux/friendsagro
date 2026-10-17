CREATE TABLE public.sheet_operations (
 operation_key text PRIMARY KEY,
 state text NOT NULL DEFAULT 'preparing',
 plan jsonb,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz
);
GRANT SELECT ON public.sheet_operations TO authenticated;
GRANT ALL ON public.sheet_operations TO service_role;
ALTER TABLE public.sheet_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins inspect sheet operations" ON public.sheet_operations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX sheet_operations_one_pending ON public.sheet_operations ((true)) WHERE state <> 'applied';
CREATE OR REPLACE FUNCTION public.begin_sheet_operation(_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.sheet_operations; result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(82416017);
 SELECT * INTO existing FROM public.sheet_operations WHERE operation_key = _key;
 IF FOUND THEN
  IF existing.state = 'preparing' THEN RAISE EXCEPTION 'Operation is being prepared; inspect before retrying'; END IF;
  RETURN jsonb_build_object('state', existing.state, 'plan', existing.plan);
 END IF;
 IF EXISTS (SELECT 1 FROM public.sheet_operations WHERE state <> 'applied') THEN RAISE EXCEPTION 'Another financial operation requires completion first'; END IF;
 INSERT INTO public.sheet_operations(operation_key, created_by) VALUES (_key, auth.uid());
 RETURN jsonb_build_object('state', 'new');
END $$;
CREATE OR REPLACE FUNCTION public.prepare_sheet_operation(_key text, _plan jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.sheet_operations SET plan = _plan, state = 'ready' WHERE operation_key = _key AND state = 'preparing' AND created_by = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Operation cannot be prepared'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.finish_sheet_operation(_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.sheet_operations SET state = 'applied', applied_at = now() WHERE operation_key = _key AND state = 'ready';
END $$;
CREATE OR REPLACE FUNCTION public.cancel_unprepared_sheet_operation(_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 DELETE FROM public.sheet_operations WHERE operation_key = _key AND state = 'preparing' AND plan IS NULL AND created_by = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.begin_sheet_operation(text), public.prepare_sheet_operation(text,jsonb), public.finish_sheet_operation(text), public.cancel_unprepared_sheet_operation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_sheet_operation(text), public.prepare_sheet_operation(text,jsonb), public.finish_sheet_operation(text), public.cancel_unprepared_sheet_operation(text) TO authenticated;