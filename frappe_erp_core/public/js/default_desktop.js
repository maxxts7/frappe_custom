$(document).on('app_ready', function () {
	function redirect_if_empty() {
		if (!frappe.session || frappe.session.user === 'Guest') return;
		const route = frappe.get_route();
		if (!route || route.length === 0 || (route.length === 1 && !route[0])) {
			frappe.set_route('my-desktop');
		}
	}

	redirect_if_empty();

	if (frappe.router && frappe.router.on) {
		frappe.router.on('change', redirect_if_empty);
	}
});
