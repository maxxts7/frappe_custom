$(document).on('app_ready', function () {
	function is_bare_desk() {
		// True only when Frappe lands on the root desk with no specific workspace/page
		const p = window.location.pathname;
		return p === '/desk' || p === '/desk/' || p === '/app' || p === '/app/';
	}

	function redirect_if_home() {
		if (!frappe.session || frappe.session.user === 'Guest') return;
		if (is_bare_desk()) {
			frappe.set_route('my-desktop');
		}
	}

	function sync_sidebar() {
		const first = ((frappe.get_route && frappe.get_route()) || [])[0] || '';
		const onDesktop = first === 'my-desktop';
		$('body').toggleClass('my-desktop-page', onDesktop);
	}

	redirect_if_home();
	sync_sidebar();

	// page-change fires after Frappe finishes setting body classes for each page
	$(document).on('page-change', sync_sidebar);

	if (frappe.router && frappe.router.on) {
		frappe.router.on('change', function () {
			redirect_if_home();
			sync_sidebar();
		});
	}
});
