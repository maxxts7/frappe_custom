frappe.pages['my-desktop'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('My Desktop'),
		single_column: true,
	});

	const $body = $(page.body).addClass('my-desktop-body');
	$body.html('<div class="my-desktop-grid" role="list"></div>');
	const $grid = $body.find('.my-desktop-grid');

	page.set_secondary_action(__('Refresh'), () => load());

	load();

	function load() {
		$grid.html(`<div class="my-desktop-loading text-muted">${__('Loading...')}</div>`);
		frappe.call({
			method:
				'frappe_erp_core.frappe_erp_core.page.my_desktop.my_desktop.get_visible_workspaces',
			callback: (r) => render(r.message || []),
		});
	}

	function render(workspaces) {
		$grid.empty();
		if (!workspaces.length) {
			$grid.html(
				`<div class="my-desktop-empty text-muted">${__('No workspaces available.')}</div>`
			);
			return;
		}
		for (const ws of workspaces) {
			const slug = frappe.router.slug(ws.name);
			const label = frappe.utils.escape_html(ws.title || ws.label || ws.name);
			const icon_html = ws.icon
				? frappe.utils.icon(ws.icon, 'lg')
				: `<span class="tile-fallback">${label.charAt(0).toUpperCase()}</span>`;
			const $tile = $(`
				<a href="/app/${slug}" class="my-desktop-tile" role="listitem">
					<div class="tile-icon">${icon_html}</div>
					<div class="tile-title">${label}</div>
				</a>
			`);
			$tile.on('click', (e) => {
				e.preventDefault();
				frappe.set_route('app', slug);
			});
			$grid.append($tile);
		}
	}
};
