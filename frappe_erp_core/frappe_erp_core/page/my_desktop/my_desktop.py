import frappe


@frappe.whitelist()
def get_visible_workspaces():
	user = frappe.session.user
	workspaces = frappe.get_all(
		"Workspace",
		filters={"public": 1},
		fields=[
			"name",
			"title",
			"label",
			"icon",
			"module",
			"sequence_id",
			"restrict_to_domain",
		],
		order_by="sequence_id asc, title asc",
	)

	if user == "Administrator":
		return workspaces

	user_roles = set(frappe.get_roles(user))
	active_domains = set(frappe.get_active_domains())
	blocked_modules = {
		row.module
		for row in frappe.get_all(
			"Block Module",
			filters={"parent": user},
			fields=["module"],
		)
	}

	visible = []
	for ws in workspaces:
		if ws.module and ws.module in blocked_modules:
			continue
		if ws.restrict_to_domain and ws.restrict_to_domain not in active_domains:
			continue
		ws_roles = {
			r.role
			for r in frappe.get_all(
				"Has Role",
				filters={"parent": ws.name, "parenttype": "Workspace"},
				fields=["role"],
			)
		}
		if ws_roles and not (ws_roles & user_roles):
			continue
		visible.append(ws)

	return visible
