import frappe


def after_install():
    frappe.db.set_default("desktop:home_page", "my-desktop")
    frappe.db.commit()
