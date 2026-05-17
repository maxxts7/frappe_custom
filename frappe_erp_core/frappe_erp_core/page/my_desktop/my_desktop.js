frappe.pages['my-desktop'].on_page_show = function () {
	$('body').addClass('my-desktop-page');
	$('.body-sidebar-container, .body-sidebar-placeholder').hide();
};

frappe.pages['my-desktop'].on_page_hide = function () {
	$('body').removeClass('my-desktop-page');
	$('.body-sidebar-container, .body-sidebar-placeholder').show();
};

frappe.pages['my-desktop'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('My Desktop'),
		single_column: true,
		hide_sidebar: true,
	});

	const $body = $(page.body).addClass('my-desktop-body');
	$body.html(`
		<header class="my-desktop-head">
			<div class="head-text">
				<h1 class="my-desktop-title"></h1>
				<div class="my-desktop-sub"></div>
			</div>
		</header>
		<div class="my-desktop-grid" role="list"></div>
	`);

	const $title = $body.find('.my-desktop-title');
	const $sub = $body.find('.my-desktop-sub');
	const $grid = $body.find('.my-desktop-grid');

	const user_first_name =
		(frappe.boot.user_info &&
			frappe.boot.user_info[frappe.session.user] &&
			frappe.boot.user_info[frappe.session.user].first_name) ||
		frappe.session.user.split('@')[0];
	$title.text(`${greeting()}, ${user_first_name}.`);

	page.set_secondary_action(__('Refresh'), () => load());

	load();

	function greeting() {
		const h = new Date().getHours();
		if (h < 12) return __('Good morning');
		if (h < 18) return __('Good afternoon');
		return __('Good evening');
	}

	function load() {
		$grid.html(`<div class="my-desktop-loading">${__('Loading...')}</div>`);
		frappe.call({
			method:
				'frappe_erp_core.frappe_erp_core.page.my_desktop.my_desktop.get_visible_workspaces',
			callback: (r) => render(r.message || []),
		});
	}

	const MODULE_COLORS = {
		Core:          { bg: '#e0f2fe', fg: '#0369a1' },
		Setup:         { bg: '#dbeafe', fg: '#1d4ed8' },
		Accounts:      { bg: '#dcfce7', fg: '#15803d' },
		Stock:         { bg: '#ffedd5', fg: '#c2410c' },
		Manufacturing: { bg: '#fef3c7', fg: '#b45309' },
		Selling:       { bg: '#e0e7ff', fg: '#4338ca' },
		Buying:        { bg: '#ede9fe', fg: '#6d28d9' },
		Projects:      { bg: '#ccfbf1', fg: '#0f766e' },
		Support:       { bg: '#cffafe', fg: '#0e7490' },
		Assets:        { bg: '#fef9c3', fg: '#a16207' },
		Website:       { bg: '#f0fdf4', fg: '#166534' },
		Quality:       { bg: '#ecfdf5', fg: '#065f46' },
		HR:            { bg: '#fce7f3', fg: '#be185d' },
		Payroll:       { bg: '#f3e8ff', fg: '#7c3aed' },
		FCRM:          { bg: '#ede9fe', fg: '#7c3aed' },
		CRM:           { bg: '#f5f3ff', fg: '#6d28d9' },
	};

	const INDICATOR_COLORS = {
		blue:         { bg: '#dbeafe', fg: '#1d4ed8' },
		green:        { bg: '#dcfce7', fg: '#15803d' },
		red:          { bg: '#fee2e2', fg: '#b91c1c' },
		orange:       { bg: '#ffedd5', fg: '#c2410c' },
		yellow:       { bg: '#fef9c3', fg: '#a16207' },
		pink:         { bg: '#fce7f3', fg: '#be185d' },
		purple:       { bg: '#f3e8ff', fg: '#7c3aed' },
		cyan:         { bg: '#cffafe', fg: '#0e7490' },
		gray:         { bg: '#f3f4f6', fg: '#374151' },
		grey:         { bg: '#f3f4f6', fg: '#374151' },
		darkgrey:     { bg: '#e5e7eb', fg: '#1f2937' },
		'light-blue': { bg: '#e0f2fe', fg: '#0369a1' },
	};

	const FALLBACK_PALETTE = [
		{ bg: '#dbeafe', fg: '#1d4ed8' },
		{ bg: '#dcfce7', fg: '#15803d' },
		{ bg: '#ffedd5', fg: '#c2410c' },
		{ bg: '#ede9fe', fg: '#7c3aed' },
		{ bg: '#fce7f3', fg: '#be185d' },
		{ bg: '#fef3c7', fg: '#b45309' },
		{ bg: '#cffafe', fg: '#0e7490' },
		{ bg: '#ccfbf1', fg: '#0f766e' },
	];

	function tile_color(ws, idx) {
		if (ws.indicator_color && INDICATOR_COLORS[ws.indicator_color]) {
			return INDICATOR_COLORS[ws.indicator_color];
		}
		if (ws.module && MODULE_COLORS[ws.module]) {
			return MODULE_COLORS[ws.module];
		}
		return FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
	}

	function render(workspaces) {
		$sub.text(__('{0} workspaces available', [workspaces.length]));
		$grid.empty();
		if (!workspaces.length) {
			$grid.html(
				`<div class="my-desktop-empty">${__('No workspaces available.')}</div>`
			);
			return;
		}
		workspaces.forEach((ws, idx) => {
			const slug = frappe.router.slug(ws.name);
			const title_text = ws.title || ws.label || ws.name;
			const label = frappe.utils.escape_html(title_text);
			const show_module =
				ws.module && ws.module.toLowerCase() !== title_text.toLowerCase();
			const subtitle = show_module
				? `<div class="tile-subtitle">${frappe.utils.escape_html(ws.module)}</div>`
				: '';
			const icon_html = ws.icon
				? frappe.utils.icon(ws.icon, 'lg', '', '', '', true)
				: `<span class="tile-fallback">${label.charAt(0).toUpperCase()}</span>`;
			const colors = tile_color(ws, idx);
			const $tile = $(`
				<a href="/app/${slug}" class="my-desktop-tile" role="listitem">
					<div class="tile-icon" style="background:${colors.bg};color:${colors.fg};">${icon_html}</div>
					<div class="tile-body">
						<div class="tile-title">${label}</div>
						${subtitle}
					</div>
				</a>
			`);
			$tile.on('click', (e) => {
				e.preventDefault();
				frappe.set_route('app', slug);
			});
			$grid.append($tile);
		});
	}
};
