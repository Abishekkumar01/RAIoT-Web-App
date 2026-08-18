from fpdf import FPDF
import os

class PortfolioPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)

    def draw_rounded_rect(self, x, y, w, h, r, style='D'):
        """Draw a rounded rectangle using arcs and lines."""
        if style == 'F':
            op = 'f'
        elif style == 'FD' or style == 'DF':
            op = 'B'
        else:
            op = 'S'
        
        hp = self.h
        # Move to start
        self._out(f'{x + r:.2f} {hp - y:.2f} m')
        # Top side
        self._out(f'{x + w - r:.2f} {hp - y:.2f} l')
        # Top-right corner
        self._out(f'{x + w:.2f} {hp - y:.2f} {x + w:.2f} {hp - (y + r):.2f} {x + w:.2f} {hp - (y + r):.2f} c')
        # Right side
        self._out(f'{x + w:.2f} {hp - (y + h - r):.2f} l')
        # Bottom-right corner
        self._out(f'{x + w:.2f} {hp - (y + h):.2f} {x + w - r:.2f} {hp - (y + h):.2f} {x + w - r:.2f} {hp - (y + h):.2f} c')
        # Bottom side
        self._out(f'{x + r:.2f} {hp - (y + h):.2f} l')
        # Bottom-left corner
        self._out(f'{x:.2f} {hp - (y + h):.2f} {x:.2f} {hp - (y + h - r):.2f} {x:.2f} {hp - (y + h - r):.2f} c')
        # Left side
        self._out(f'{x:.2f} {hp - (y + r):.2f} l')
        # Top-left corner
        self._out(f'{x:.2f} {hp - y:.2f} {x + r:.2f} {hp - y:.2f} {x + r:.2f} {hp - y:.2f} c')
        self._out(op)

    def header_section(self):
        # Dark header background
        self.set_fill_color(15, 12, 41)
        self.rect(0, 0, 210, 52, 'F')
        # Accent purple strip
        self.set_fill_color(102, 126, 234)
        self.rect(0, 52, 210, 2, 'F')

        # Title
        self.set_xy(20, 14)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 26)
        self.cell(0, 12, "Project Portfolio", new_x="LMARGIN", new_y="NEXT")

        # Subtitle
        self.set_xy(20, 30)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(200, 200, 220)
        self.cell(0, 8, "Individual & Collaborative Projects", new_x="LMARGIN", new_y="NEXT")

        # Accent line
        self.set_draw_color(102, 126, 234)
        self.set_line_width(0.8)
        self.line(20, 42, 65, 42)

    def section_label(self, text):
        self.set_y(self.get_y() + 4)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(102, 126, 234)
        label = text.upper()
        w = self.get_string_width(label) + 4
        self.cell(w, 6, label, new_x="RIGHT")
        # Line after label
        self.set_draw_color(180, 190, 240)
        self.set_line_width(0.3)
        y = self.get_y() + 3
        self.line(self.get_x() + 2, y, 190, y)
        self.ln(12)

    def draw_badge(self, text, bg_color, text_color):
        bw = self.get_string_width(text) + 10
        bx = self.get_x()
        by = self.get_y()
        self.set_fill_color(*bg_color)
        self.rect(bx, by, bw, 6, 'F')
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*text_color)
        self.cell(bw, 6, text, align="C", new_x="RIGHT")
        self.set_x(self.get_x() + 3)

    def project_card(self, title, domain, duration, organization, description, 
                     link=None, badges=None, accent_color=(102, 126, 234)):
        start_y = self.get_y()
        card_x = 18
        card_w = 174
        card_start_y = start_y

        # Title
        self.set_xy(card_x + 4, start_y)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(26, 26, 46)
        self.cell(card_w - 50, 8, title, new_x="RIGHT")
        
        # Domain badge 
        self.set_font("Helvetica", "B", 8)
        domain_w = self.get_string_width(domain) + 12
        badge_x = 190 - domain_w
        self.set_xy(badge_x, start_y + 1)
        self.set_fill_color(*accent_color)
        self.set_text_color(255, 255, 255)
        self.rect(badge_x, start_y + 1, domain_w, 6, 'F')
        self.cell(domain_w, 6, domain, align="C", new_x="LMARGIN", new_y="NEXT")

        # Meta info
        self.set_y(start_y + 12)
        self.set_x(card_x + 4)
        
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 90)
        self.cell(18, 5, "Duration: ", new_x="RIGHT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(120, 120, 130)
        self.cell(50, 5, duration, new_x="RIGHT")

        self.set_x(self.get_x() + 8)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 90)
        self.cell(24, 5, "Organization: ", new_x="RIGHT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(120, 120, 130)
        self.cell(60, 5, organization, new_x="LMARGIN", new_y="NEXT")

        # Description
        self.set_y(self.get_y() + 5)
        self.set_x(card_x + 4)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(58, 58, 74)
        self.multi_cell(card_w - 8, 5.5, description, new_x="LMARGIN", new_y="NEXT")

        # Link or no-link
        self.set_y(self.get_y() + 4)
        self.set_x(card_x + 4)
        if link:
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(102, 126, 234)
            link_text = f"Live: {link.replace('https://', '')}"
            link_w = self.get_string_width(link_text) + 14
            
            # Draw link border box
            lx = self.get_x()
            ly = self.get_y()
            self.set_draw_color(102, 126, 234)
            self.set_line_width(0.4)
            self.rect(lx, ly, link_w, 8, 'D')
            self.set_xy(lx + 5, ly)
            # Clickable link!
            self.cell(link_w - 10, 8, link_text, new_x="LMARGIN", new_y="NEXT", link=link)
        else:
            self.set_font("Helvetica", "I", 9)
            self.set_text_color(160, 160, 160)
            self.cell(60, 7, "Live link currently not available", new_x="LMARGIN", new_y="NEXT")

        # Badges
        if badges:
            self.set_y(self.get_y() + 3)
            self.set_x(card_x + 4)
            for badge_text, badge_bg, badge_fg in badges:
                self.draw_badge(badge_text, badge_bg, badge_fg)

        card_end_y = self.get_y() + 8

        # Left accent bar
        self.set_fill_color(*accent_color)
        self.rect(card_x, card_start_y - 2, 1.5, card_end_y - card_start_y + 2, 'F')

        # Card border
        self.set_draw_color(230, 230, 240)
        self.set_line_width(0.3)
        self.rect(card_x - 1, card_start_y - 4, card_w + 2, card_end_y - card_start_y + 6, 'D')

        self.set_y(card_end_y + 8)

    def footer(self):
        self.set_y(-18)
        self.set_draw_color(240, 240, 240)
        self.set_line_width(0.3)
        self.line(20, self.get_y(), 190, self.get_y())
        self.set_y(self.get_y() + 4)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(170, 170, 170)
        self.cell(0, 6, "Project Portfolio  |  Abishek Kumar  |  April 2026", align="C")


def generate_pdf():
    pdf = PortfolioPDF()
    pdf.add_page()

    # Header
    pdf.header_section()

    # Section label
    pdf.set_y(62)
    pdf.section_label("Projects")

    # ── Project 1: RAIoT ──
    pdf.project_card(
        title="RAIoT - Robotics & AI of Things Platform",
        domain="IoT / Robotics",
        duration="2023 - Present",
        organization="RAIoT, Amity University Rajasthan",
        description=(
            "Built a comprehensive full-stack web application serving as the central platform for the "
            "RAIoT (Robotics & AI of Things) community. The platform features a dynamic dashboard with "
            "real-time inventory management, component tracking, GitHub repository integration, and team "
            "collaboration tools. Developed using Next.js, TypeScript, and Firebase with a modern, "
            "responsive UI for seamless cross-device access."
        ),
        link="https://raiot.site",
        badges=[
            ("DEPLOYED", (200, 230, 255), (21, 101, 192)),
            ("GROUP PROJECT", (232, 245, 233), (46, 125, 50)),
        ],
        accent_color=(102, 126, 234)
    )

    # ── Project 2: InteliCart ──
    pdf.project_card(
        title="InteliCart - Smart HealthCare Shopping",
        domain="HealthCare",
        duration="August 2024",
        organization="Self-Developed",
        description=(
            "Developed InteliCart, a website that allows users to scan product images for ingredient "
            "analysis, health risk categorization, and healthier alternatives. It includes quick billing, "
            "ingredient breakdowns, inventory tracking, and displays product pros and cons. Additionally, "
            "it compares prices across multiple e-commerce platforms to show the lowest price, helping "
            "users make informed and cost-effective purchasing decisions."
        ),
        link=None,
        badges=[
            ("GROUP PROJECT", (232, 245, 233), (46, 125, 50)),
        ],
        accent_color=(245, 87, 108)
    )

    # ── Project 3: IWMS ──
    pdf.project_card(
        title="Intelligent Waste Management System (IWMS)",
        domain="IoT / Embedded",
        duration="January 2022 - 2024",
        organization="RAIoT, Amity University Rajasthan",
        description=(
            "Designed an Arduino and ESP-based Intelligent Waste Management System featuring GPS "
            "integration for live location tracking and optimized routes. Incorporated sensor-driven "
            "fill level monitoring with API notifications for Telegram, WhatsApp, SMS, and Gmail for "
            "dumpsters, enhanced with an automatic lid lock system, adhering to compliance standards. "
            "The system is fueled by solar energy, AC, or a battery for maximum sustainability and reliability."
        ),
        link=None,
        badges=[
            ("UNDER PROVISIONAL PATENT", (255, 243, 205), (133, 100, 4)),
            ("GROUP PROJECT", (232, 245, 233), (46, 125, 50)),
        ],
        accent_color=(79, 172, 254)
    )

    # Save
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Projects_Portfolio_Abishek_Kumar.pdf")
    pdf.output(output_path)
    print(f"PDF generated successfully: {output_path}")
    return output_path

if __name__ == "__main__":
    generate_pdf()
