begin;

alter table public.employee_followups
  drop constraint if exists employee_followups_followup_type_check;

alter table public.employee_followups
  add constraint employee_followups_followup_type_check
  check (followup_type in ('metre_a_metre', 'metre_a_metre_apres_midi'));

alter table public.employee_followup_sections
  drop constraint if exists employee_followup_sections_section_key_check;

alter table public.employee_followup_sections
  add constraint employee_followup_sections_section_key_check
  check (
    section_key in (
      'presentation_rayon',
      'balisage_signaletique',
      'ruptures_fraicheur',
      'reserve_logistique',
      'epi',
      'am_etat_reserve',
      'am_tri_caddie',
      'am_remplissage_produits_cles',
      'am_tg_plateau',
      'am_balisage_prix',
      'am_proprete_rayon',
      'am_ruptures_tenue',
      'am_epi'
    )
  );

commit;
